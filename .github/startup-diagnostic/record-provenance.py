#!/usr/bin/env python3
"""Verify pinned input and save hashes only; never export source/state/config."""
from pathlib import Path
import hashlib
import json
import os
import subprocess
import sys
import zipfile

checkout = Path(sys.argv[1]).resolve()
destination = Path(sys.argv[2]).resolve()
label = sys.argv[3]
apk = Path(sys.argv[4]).resolve() if len(sys.argv) > 4 else None
package = Path(__file__).resolve().parent
pin = json.loads((package / 'pins.json').read_text())['heads'][label]

def git(*args):
    return subprocess.check_output(['git', '-C', str(checkout), *args])

def digest(path):
    value = hashlib.sha256()
    with path.open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            value.update(chunk)
    return value.hexdigest()

sha = git('rev-parse', 'HEAD').decode().strip()
tree = git('rev-parse', 'HEAD^{tree}').decode().strip()
if sha != pin['sha'] or tree != pin['tree']:
    raise SystemExit('Input checkout does not match pinned SHA/tree')
changed = sorted(path for path in git('diff', '--name-only', 'HEAD', '-z').decode().split('\0') if path)
allowed = ['android/gradle.properties'] if apk else []
if any(path not in allowed for path in changed):
    raise SystemExit('Unexpected tracked source changes: ' + ', '.join(changed))
if 'android/gradle.properties' in changed:
    if (checkout / 'android/gradle.properties').read_bytes() != (checkout / 'android/gradle.properties.github').read_bytes():
        raise SystemExit('Gradle override does not match the standard CI file')
product_paths = ['app', 'android', 'patches', '.yarn/patches', 'package.json', 'yarn.lock', 'tests', 'scripts']
input_digest = hashlib.sha256(git('ls-tree', '-r', '--full-tree', 'HEAD', '--', *product_paths)).hexdigest()
record = {
    'schemaVersion': 1,
    'inputLabel': label,
    'checkoutSha': sha,
    'checkoutTree': tree,
    'inputProductTreeDigest': input_digest,
    'inputProductDigestPaths': product_paths,
    'trackedFileChanges': changed,
    'gradlePropertiesGithubSha256': digest(checkout / 'android/gradle.properties.github'),
    'workflowRunId': os.environ.get('GITHUB_RUN_ID'),
    'workflowSha': os.environ.get('GITHUB_SHA'),
    'runnerArch': os.environ.get('RUNNER_ARCH'),
}
package_files = ['package.json', 'dist/PerpsController.js', 'dist/index.js',
                 'dist/services/AccountService.js', 'dist/services/RewardsIntegrationService.js']
installed = checkout / 'node_modules/@metamask/perps-controller'
record['installedPerpsFileSha256'] = {
    name: digest(installed / name) for name in package_files if (installed / name).is_file()
}
if apk:
    record['buildMode'] = 'fresh-native-and-js-no-donor-no-repack'
    record['apkSha256'] = digest(apk)
    record['apkSizeBytes'] = apk.stat().st_size
    with zipfile.ZipFile(apk) as archive:
        record['nativeAbis'] = sorted({name.split('/')[1] for name in archive.namelist()
                                      if name.startswith('lib/') and name.endswith('.so')})
        bundle = archive.read('assets/index.android.bundle')
        record['jsBundleSha256'] = hashlib.sha256(bundle).hexdigest()
        record['jsBundleSizeBytes'] = len(bundle)
        record['jsBundleFirst8Hex'] = bundle[:8].hex()
    if record['nativeAbis'] != ['x86_64']:
        raise SystemExit('Diagnostic expects exactly the CI x86_64 native ABI')
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text(json.dumps(record, indent=2) + '\n')
print('Pinned product provenance saved')
