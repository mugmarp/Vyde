"""Sign CI's release APK using persistent Actions secrets, never a fresh key."""
import base64
import os
from pathlib import Path
import re
import subprocess
import tempfile


def main():
    names = ['ANDROID_RELEASE_KEYSTORE_BASE64', 'ANDROID_RELEASE_STORE_PASSWORD',
             'ANDROID_RELEASE_KEY_PASSWORD', 'ANDROID_RELEASE_KEY_ALIAS']
    missing = [name for name in names if not os.environ.get(name)]
    if missing:
        raise SystemExit('Release signing secrets are missing: ' + ', '.join(missing))
    output = Path('artifacts/vyde/android/app/build/outputs/apk/release')
    candidates = list(output.glob('*-unsigned.apk'))
    if len(candidates) != 1:
        raise SystemExit('Expected exactly one unsigned release APK')
    sdk = Path(os.environ.get('ANDROID_HOME') or os.environ['ANDROID_SDK_ROOT'])
    signers = sorted((sdk / 'build-tools').glob('*/apksigner'),
                     key=lambda path: tuple(map(int, re.findall(r'\d+', path.parent.name))))
    if not signers:
        raise SystemExit('Android apksigner was not found')
    signed = output / 'app-release.apk'
    # Only this step receives the secrets. Its private temporary directory and
    # keystore are removed after success or failure and never uploaded.
    with tempfile.TemporaryDirectory(prefix='vyde-signing-', dir=os.environ['RUNNER_TEMP']) as directory:
        keystore = Path(directory) / 'release.p12'
        keystore.write_bytes(base64.b64decode(os.environ[names[0]], validate=True))
        keystore.chmod(0o600)
        child_env = {key: value for key, value in os.environ.items() if key != names[0]}
        subprocess.run([
            str(signers[-1]), 'sign', '--ks', str(keystore), '--ks-type', 'PKCS12',
            '--ks-key-alias', os.environ['ANDROID_RELEASE_KEY_ALIAS'],
            '--ks-pass', 'env:ANDROID_RELEASE_STORE_PASSWORD',
            '--key-pass', 'env:ANDROID_RELEASE_KEY_PASSWORD',
            '--out', str(signed), str(candidates[0]),
        ], check=True, env=child_env)
    candidates[0].unlink()
    print('Signed release APK; certificate verification is the next required step.')


if __name__ == '__main__':
    main()
