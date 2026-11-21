"""Exercise the CI verifier with synthetic APK ZIPs and mocked Android tools."""
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import zipfile

spec = importlib.util.spec_from_file_location('verifier', Path(__file__).parents[1] / 'ci/verify_android_apk.py')
verifier = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verifier)
DIGEST = 'ab' * 32


class ProvenanceTests(unittest.TestCase):
    def verify(self, variant='debug', signing=None, signature_result=0, package='com.vyde.android', corrupt=False, bundle=True):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            directory = root / 'artifacts/vyde/android/app/build/outputs/apk' / variant
            directory.mkdir(parents=True)
            apk = directory / 'app.apk'
            with zipfile.ZipFile(apk, 'w') as archive:
                archive.writestr('AndroidManifest.xml', 'synthetic manifest')
                if bundle:
                    archive.writestr('assets/index.android.bundle', 'synthetic bundle')
            if corrupt:
                apk.write_bytes(b'not a ZIP')
            config = root / 'config'
            config.mkdir()
            (config / 'android-release-signing.json').write_text(json.dumps({'certificateSha256': DIGEST}))
            sdk = root / 'sdk/build-tools/36.0.0'
            sdk.mkdir(parents=True)
            (sdk / 'aapt').touch()
            badging = f"package: name='{package}' versionCode='1' versionName='1.0'\n"
            if variant == 'debug':
                badging += 'application-debuggable\n'
            signing = signing if signing is not None else f'Signer #1 certificate SHA-256 digest: {DIGEST}\n'

            def run(command, **kwargs):
                if command[1] == 'dump':
                    return subprocess.CompletedProcess(command, 0, badging, '')
                return subprocess.CompletedProcess(command, signature_result, signing, '')

            previous = os.getcwd()
            try:
                os.chdir(root)
                with patch.dict(os.environ, {
                    'APK_VARIANT': variant, 'ANDROID_HOME': str(root / 'sdk'),
                    'EXPECTED_ANDROID_PACKAGE': 'com.vyde.android', 'GITHUB_SHA': 'revision',
                    'GITHUB_SERVER_URL': 'https://github.com', 'GITHUB_REPOSITORY': 'example/project',
                    'GITHUB_RUN_ID': '123',
                }), patch.object(verifier.subprocess, 'run', side_effect=run), contextlib.redirect_stdout(io.StringIO()):
                    verifier.main()
                return json.loads((directory / 'apk-provenance.json').read_text())
            finally:
                os.chdir(previous)

    def test_numbered_signer(self):
        result = self.verify()['artifacts'][0]
        self.assertEqual(result['signerCertificateSha256'], [DIGEST])
        self.assertEqual(result['signing'], 'debug-key')
        self.assertTrue(result['installable'])
        self.assertEqual(len(result['sha256']), 64)

    def test_sdk_range_signer(self):
        result = self.verify(signing=f'Signer (minSdkVersion=24, maxSdkVersion=32) certificate SHA-256 digest: {DIGEST}\n')
        self.assertEqual(result['artifacts'][0]['signerCertificateSha256'], [DIGEST])

    def test_actual_ci_v2_signer_output(self):
        output = ('V2 Signer: certificate DN: CN=Android Debug, OU=Android\n'
                  'V2 Signer: certificate SHA-256 digest: fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c\n'
                  'V2 Signer: certificate SHA-1 digest: 5e8f16062ea3cd2c4a0d547876baa6f38cabf625\n')
        result = self.verify(signing=output)
        self.assertEqual(result['artifacts'][0]['signerCertificateSha256'],
                         ['fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c'])

    def test_unsigned_release_is_rejected(self):
        with self.assertRaisesRegex(SystemExit, 'Release APK signing verification failed'):
            self.verify(variant='release', signing='', signature_result=1)

    def test_signed_release_has_installable_provenance(self):
        result = self.verify(variant='release')['artifacts'][0]
        self.assertEqual(result['signing'], 'release-key')
        self.assertTrue(result['installable'])
        self.assertEqual(result['signerCertificateSha256'], [DIGEST])

    def test_wrong_release_certificate_is_rejected(self):
        with self.assertRaisesRegex(SystemExit, 'does not match the pinned identity'):
            self.verify(variant='release', signing='V2 Signer: certificate SHA-256 digest: ' + 'cd' * 32)

    def test_failed_debug_verification_is_rejected_even_with_certificate(self):
        with self.assertRaisesRegex(SystemExit, 'signing verification failed'):
            self.verify(signature_result=1)

    def test_missing_debug_certificate_is_rejected(self):
        with self.assertRaisesRegex(SystemExit, 'signing verification failed'):
            self.verify(signing='Signer #1 certificate SHA-256 digest: invalid')

    def test_unexpected_package_is_rejected(self):
        with self.assertRaisesRegex(SystemExit, 'Unexpected Android package'):
            self.verify(package='other.app')

    def test_missing_bundle_is_rejected(self):
        with self.assertRaisesRegex(SystemExit, 'missing its embedded JavaScript'):
            self.verify(bundle=False)

    def test_unknown_variant_is_rejected(self):
        with self.assertRaisesRegex(SystemExit, 'Unsupported APK variant'):
            self.verify(variant='unknown')

    def test_corrupt_apk_is_rejected(self):
        with self.assertRaises(zipfile.BadZipFile):
            self.verify(corrupt=True)


if __name__ == '__main__':
    unittest.main()
