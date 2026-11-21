"""Signing boundary tests use fake APKs/tools, never a real private key."""
import base64
import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('signer', Path(__file__).parents[1] / 'ci/sign_android_release.py')
signer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(signer)


class SigningTests(unittest.TestCase):
    def exercise(self, fail=False, omit=None):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            output = root / 'artifacts/vyde/android/app/build/outputs/apk/release'
            output.mkdir(parents=True)
            unsigned = output / 'app-release-unsigned.apk'
            unsigned.write_bytes(b'fake unsigned fixture')
            tool = root / 'sdk/build-tools/36.0.0/apksigner'
            tool.parent.mkdir(parents=True)
            tool.touch()
            environment = {
                'ANDROID_HOME': str(root / 'sdk'), 'RUNNER_TEMP': str(root),
                'ANDROID_RELEASE_KEYSTORE_BASE64': base64.b64encode(b'fake key').decode(),
                'ANDROID_RELEASE_STORE_PASSWORD': 'fixture-private-password',
                'ANDROID_RELEASE_KEY_PASSWORD': 'fixture-private-password',
                'ANDROID_RELEASE_KEY_ALIAS': 'fixture-alias',
            }
            if omit:
                environment.pop(omit)
            key_paths = []

            def run(command, **kwargs):
                self.assertNotIn('fixture-private-password', ' '.join(command))
                self.assertNotIn('ANDROID_RELEASE_KEYSTORE_BASE64', kwargs['env'])
                key = Path(command[command.index('--ks') + 1])
                key_paths.append(key)
                self.assertEqual(key.read_bytes(), b'fake key')
                self.assertEqual(key.stat().st_mode & 0o777, 0o600)
                if fail:
                    raise subprocess.CalledProcessError(1, command)
                Path(command[command.index('--out') + 1]).write_bytes(b'fake signed fixture')

            previous = os.getcwd()
            try:
                os.chdir(root)
                with patch.dict(os.environ, environment, clear=True), patch.object(signer.subprocess, 'run', side_effect=run):
                    if omit:
                        with self.assertRaisesRegex(SystemExit, 'secrets are missing'):
                            signer.main()
                    elif fail:
                        with self.assertRaises(subprocess.CalledProcessError):
                            signer.main()
                    else:
                        signer.main()
                self.assertTrue(all(not key.exists() for key in key_paths))
                self.assertEqual(unsigned.exists(), bool(fail or omit))
                if not fail and not omit:
                    self.assertEqual((output / 'app-release.apk').read_bytes(), b'fake signed fixture')
                return key_paths
            finally:
                os.chdir(previous)

    def test_signing_removes_private_material_and_publishes_only_signed_output(self):
        self.assertEqual(len(self.exercise()), 1)

    def test_failure_removes_private_material_and_keeps_the_unsigned_input(self):
        self.assertEqual(len(self.exercise(fail=True)), 1)

    def test_missing_secret_fails_without_attempting_signing(self):
        self.assertEqual(self.exercise(omit='ANDROID_RELEASE_KEYSTORE_BASE64'), [])


if __name__ == '__main__':
    unittest.main()
