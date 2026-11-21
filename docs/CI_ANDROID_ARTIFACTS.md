# Android debug and unsigned release artifacts

Updated: 2026-11-21 (Africa/Kampala).

The owner requested both APK variants and explicitly chose to keep release APKs unsigned until signing is configured. All APK compilation occurs in GitHub Actions.

## Workflow outputs

The `android-build` matrix builds debug and release independently after verification, on `main`/version-tag pushes and manual dispatch. One variant failing does not cancel the other. Each successful variant uploads its own artifact for 14 days:

| Artifact | Gradle task | Signing | Intended use |
| --- | --- | --- | --- |
| `vyde-android-debug-apk` | `assembleDebug` | Verified debug signing certificate | Installable development/device testing APK |
| `vyde-android-release-unsigned-apk` | `assembleRelease` | Explicitly unsigned | Release-variant build verification and later signing; not directly installable |

These are Actions artifacts, not automatic GitHub Releases or a published F-Droid repository. A release build configuration is not proof of feature readiness or production distribution.

## Explicit signing behavior

Expo's generated Android template signs release builds with the debug configuration by default. CI appends an Android DSL override after prebuild to set release `signingConfig` to `null`. The release verification step rejects a debuggable APK, a successfully verified signature, a v1 certificate entry, or an APK signing block. No release key, password or repository secret is generated or configured by this change.

When release signing is chosen later, use a persistent owner-controlled key, secure backup and protected CI credentials. Replace the explicit unsigned path and its verification/artifact naming deliberately. Debug-key artifacts and future production-key artifacts are not interchangeable for in-place updates.

## Provenance and validation

Every uploaded variant includes `apk-provenance.json` containing source commit, run URL, variant, APK filename/size/SHA-256, package/version, debuggable state, signing status and certificate fingerprints when signed.

Verification checks the expected package `com.vyde.android`, ZIP integrity, variant-specific debuggability and signing state. The per-APK checksum differs from GitHub's artifact ZIP checksum. Debug signatures are verified with Android `apksigner`. Unsigned release metadata explicitly records `installable: false` and an empty certificate list.

## Downloading

Open a successful workflow run on the repository's Actions tab and select the desired artifact. Extract the ZIP. Use the debug APK for S21 testing while release signing remains deferred. Always record the source revision and do not assume an old artifact includes newer migrations or media changes.

See [the device test baseline](ANDROID_DEVICE_TEST_BASELINE.md) for the initial successful build and deferred runtime checks. Future workflow results must establish successful execution of this new two-variant matrix; YAML parsing alone does not prove release compilation.

## Re-verification fixes

Run `44842072831` compiled its debug APK but failed provenance because the certificate parser recognized only numbered signers. The verifier now also supports the SDK-range signer form documented by [AOSP](https://android.googlesource.com/platform/build/+/master/tools/releasetools/check_target_files_signatures.py); a successful `apksigner` exit remains mandatory for debug. Failure diagnostics include tool output. The parser change awaits CI confirmation against the actual APK output.

Run `44843351039` passed workspace verification and exports but its release Gradle bundle task failed with `Cannot find module 'babel-preset-expo'`. The app now declares that preset directly at version `54.0.12`, and both APK jobs resolve the Babel configuration before compiling native code.

React Native's installed Gradle plugin treats debug as a variant that skips bundling by default. CI now overrides `react.debuggableVariants` to embed JavaScript in the sideload debug APK. Both variants must contain a nonempty `assets/index.android.bundle` before upload. This closes a packaging gap; it does not establish successful launch or offline playback on the S21. Earlier debug artifacts are not evidence of standalone launch.

The verifier lives in `scripts/ci/verify_android_apk.py`. Nine synthetic-APK/tool-boundary tests exercise numbered/SDK-range certificates, unsigned release output, signed-release rejection, invalid/missing debug certificates, wrong package, missing bundle and corrupt ZIP. These run through `pnpm test`; they do not invoke Gradle or Android tools locally.
