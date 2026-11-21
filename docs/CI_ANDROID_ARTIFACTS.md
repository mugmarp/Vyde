# Android debug and signed release artifacts

Updated: 2026-11-21 (Africa/Kampala).

The owner initially chose unsigned releases, then requested installable release APKs signed through GitHub Actions. All APK compilation and signing occur in Actions. One-time release-key provisioning is credential setup, not a local app build.

## Outputs and identity

| Artifact | Configuration | Android signing | Installation |
| --- | --- | --- | --- |
| `vyde-android-debug-apk` | Debug with embedded JavaScript | Expo/React Native template debug key | Installable development build |
| `vyde-android-release-apk` | Release with embedded JavaScript | Persistent Vyde release key from Actions secrets | Installable after signature/pin verification |

Both use package `com.vyde.android`. Different certificates mean a release APK cannot update a debug-signed installation in place. Preserve/export required local data before any intentional transition requiring uninstall; this signing change does not uninstall the user's app. Updates between release APKs require retaining the same release key.

GitHub Actions executes Android `apksigner` using Vyde's keystore. GitHub commit signatures and artifact attestations are distinct; they do not provide an Android APK signing certificate. See [Android app signing](https://developer.android.com/studio/publish/app-signing).

These remain Actions artifacts retained for 14 days, not automatic GitHub Releases, F-Droid publication or proof of release feature readiness. Old `vyde-android-release-unsigned-apk` artifacts retain their original unsigned status; enabling signing does not modify previously uploaded files.

## How debug signing worked

The generated Gradle project selects its bundled `android/app/debug.keystore`, alias `androiddebugkey`, with the conventional template password `android`. It is not GitHub's commit-signing key and is not generated as a new release identity for every run. Inspection of the template certificate matches the debug certificate observed in CI:

`fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`

This is a development identity, not Vyde's private release key.

## Persistent release signing

The release key was generated once as a password-protected PKCS12 keystore with a 3072-bit RSA key. Its public certificate pin and alias are in [the release identity configuration](../config/android-release-signing.json). The expected SHA-256 fingerprint is:

`72e2ca470b55cfc0f80570e64e82ea5de550e602c637179b712dad3db4a957b6`

Private local recovery material is under `/home/mark/.local/share/vyde/signing/`: `vyde-release.p12` and `credentials.json`. The directory is mode 0700 and both files are mode 0600. Retain a secure owner-controlled backup of both files before relying on public releases. Private key material and passwords are not committed or printed.

Actions secrets:

- `ANDROID_RELEASE_KEYSTORE_BASE64`
- `ANDROID_RELEASE_STORE_PASSWORD`
- `ANDROID_RELEASE_KEY_PASSWORD`
- `ANDROID_RELEASE_KEY_ALIAS`

The keystore is encoded for transport, then protected by GitHub's [Actions secret storage](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions); base64 itself is not encryption. Values are supplied only to the dedicated release-signing step, after compilation. Missing secrets fail that release job rather than silently producing an unsigned or debug-key release. Debug and release jobs remain independent.

CI first overrides Expo's generated debug signing for the release build. `sign_android_release.py` decodes the persistent keystore into a private temporary directory, signs via `apksigner` with passwords passed by environment-variable reference, removes the temporary key on success/failure, and removes the unsigned input after successful signing. CI does not generate or rotate release keys.

## Verification and provenance

The verifier checks package `com.vyde.android`, ZIP integrity, a nonempty `assets/index.android.bundle`, variant-specific debuggability, and successful Android signature verification. Release certificate fingerprints must match the committed public pin exactly. Unsigned releases and releases signed with a different key are rejected.

Successful release provenance records `signing: release-key`, `installable: true` and the verified fingerprint. Debug records `signing: debug-key`. Every uploaded APK includes source revision, run URL, file size and APK SHA-256. GitHub's artifact ZIP checksum is distinct from the APK checksum inside it.

Fifteen synthetic/tool-boundary cases cover signature output forms, signed release provenance, unsigned/wrong-key rejection, malformed APKs, missing bundles, missing signing secrets and private-temporary-file cleanup. These execute through `pnpm test` without local APK compilation or signing. Real release signing and certificate-pin validation passed in run [44932070413](https://github.com/mugmarp/Vyde/actions/runs/44932070413), source `063bbdb`.

## Prior artifact history

The original debug build `f7417fd` compiled but lacked its JavaScript bundle and failed standalone startup. The workflow now embeds and verifies that bundle. Initial provenance parsing recognized only numbered signers; it was corrected for SDK-range and actual `V2 Signer:` output. Run [44869087011](https://github.com/mugmarp/Vyde/actions/runs/44869087011), source `6d58ba8`, passed both debug and then-unsigned release jobs; its debug APK was installed and launched successfully on the mione U1. Subsequent `5081042` builds also passed. These runs predate private release signing.


## First verified signed release

Run [44932070413](https://github.com/mugmarp/Vyde/actions/runs/44932070413), source `063bbdb5eb18f4527c46b82f546bf71cb3063767`, passed all jobs. Its [release artifact](https://github.com/mugmarp/Vyde/actions/runs/44932070413/artifacts/14718499546) passed actual APK signature and pinned certificate verification. APK SHA-256: `5f4ab71c40def1ec5726f2b8501286d289a2e15f2de3f94f2e7bf9cb1b2a61be`. This establishes signed packaging, not device installation or media acceptance. It predates the subsequent critical-audit remediation commits.
