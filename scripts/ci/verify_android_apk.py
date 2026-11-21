import hashlib, json, os, pathlib, re, struct, subprocess, zipfile


def signer_certificates(output):
    # apksigner prints numbered signers or SDK-range signers. See AOSP's
    # check_target_files_signatures.py for both documented output forms.
    return sorted(set(re.findall(
        r'^Signer (?:#\d+|\([^\r\n)]+\)) certificate SHA-256 digest:\s*([0-9a-fA-F]{64})\s*$',
        output, re.MULTILINE,
    )))


def main():
    variant = os.environ['APK_VARIANT']
    apk_dir = pathlib.Path('artifacts/vyde/android/app/build/outputs/apk') / variant
    sdk = pathlib.Path(os.environ.get('ANDROID_HOME') or os.environ['ANDROID_SDK_ROOT'])
    tools = sorted((sdk / 'build-tools').glob('*/aapt'), key=lambda p: tuple(map(int, re.findall(r'\d+', p.parent.name))))
    if not tools:
        raise SystemExit('Android build tools not found')
    aapt = tools[-1]
    apks = sorted(apk_dir.glob('*.apk'))
    if not apks:
        raise SystemExit('No ' + variant + ' APK was produced')
    artifacts = []
    for apk in apks:
        badging = subprocess.run([str(aapt), 'dump', 'badging', str(apk)], check=True, capture_output=True, text=True).stdout
        package = next((line for line in badging.splitlines() if line.startswith('package:')), '')
        identity = dict(re.findall(r"(\w+)='([^']*)'", package))
        if identity.get('name') != os.environ['EXPECTED_ANDROID_PACKAGE']:
            raise SystemExit('Unexpected Android package: ' + identity.get('name', 'missing'))
        debuggable = 'application-debuggable' in badging
        if debuggable != (variant == 'debug'):
            raise SystemExit('Unexpected debuggable state for ' + variant)
        with zipfile.ZipFile(apk) as archive:
            if archive.testzip() is not None:
                raise SystemExit('APK ZIP integrity check failed')
            if 'assets/index.android.bundle' not in archive.namelist() or not archive.getinfo('assets/index.android.bundle').file_size:
                raise SystemExit('APK is missing its embedded JavaScript bundle')
            v1_signatures = any(re.match(r'META-INF/[^/]+\.(RSA|DSA|EC)$', name, re.I) for name in archive.namelist())
        signing = subprocess.run([str(aapt.parent / 'apksigner'), 'verify', '--print-certs', str(apk)], capture_output=True, text=True)
        certificates = signer_certificates(signing.stdout)
        if variant == 'debug':
            if signing.returncode != 0 or not certificates:
                raise SystemExit('Debug APK signing verification failed\n' + signing.stdout + signing.stderr)
        else:
            # Check the actual signing-block position, not arbitrary
            # strings that might also appear inside an application asset.
            with apk.open('rb') as binary:
                binary.seek(max(0, apk.stat().st_size - 65557))
                tail = binary.read()
                eocd = tail.rfind(b'PK\x05\x06')
                if eocd < 0:
                    raise SystemExit('Missing APK ZIP directory')
                directory = struct.unpack_from('<I', tail, eocd + 16)[0]
                if directory == 0xffffffff or directory < 16:
                    raise SystemExit('Unsupported APK ZIP directory')
                binary.seek(directory - 16)
                signing_block = binary.read(16) == b'APK Sig Block 42'
            if signing.returncode == 0 or certificates or v1_signatures or signing_block:
                raise SystemExit('Release must remain unsigned until signing is configured')
        with apk.open('rb') as binary:
            digest = hashlib.file_digest(binary, 'sha256').hexdigest()
        artifacts.append({'file': apk.name, 'bytes': apk.stat().st_size, 'sha256': digest, 'package': identity['name'], 'versionName': identity.get('versionName'), 'versionCode': identity.get('versionCode'), 'debuggable': debuggable, 'signing': 'debug-key' if variant == 'debug' else 'unsigned', 'installable': variant == 'debug', 'signerCertificateSha256': certificates})
    provenance = {'variant': variant, 'sourceCommit': os.environ['GITHUB_SHA'], 'run': os.environ['GITHUB_SERVER_URL'] + '/' + os.environ['GITHUB_REPOSITORY'] + '/actions/runs/' + os.environ['GITHUB_RUN_ID'], 'artifacts': artifacts}
    (apk_dir / 'apk-provenance.json').write_text(json.dumps(provenance, indent=2) + '\n')
    print(json.dumps(provenance, indent=2))


if __name__ == "__main__":
    main()
