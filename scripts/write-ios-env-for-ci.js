#!/usr/bin/env node
/**
 * CI-only (invoked from build.sh prebuild_ios when CI=true and MM_FOX_CODE is set):
 * Xcode resolves Info.plist $(MM_FOX_CODE) from ios/debug.xcconfig and
 * ios/release.xcconfig. The "Override xcconfig files" phase copies ../.ios.env
 * (or .ios.env.example if missing). Shell-only env (e.g. GITHUB_ENV) does not
 * reach Xcode without this file.
 */
const fs = require('fs');

const examplePath = '.ios.env.example';
const outPath = '.ios.env';
const foxCode = process.env.MM_FOX_CODE;

if (!fs.existsSync(examplePath)) {
  console.error(`write-ios-env-for-ci: missing ${examplePath}`);
  process.exit(1);
}

const example = fs.readFileSync(examplePath, 'utf8');

if (!foxCode || String(foxCode).trim() === '') {
  console.error(
    'write-ios-env-for-ci: MM_FOX_CODE is empty. Set MM_FOX_CODE in the GitHub Environment for this build (same value as Bitrise).',
  );
  process.exit(1);
}

const next = example.split(/\r?\n/).map((line) => {
  if (/^\s*MM_FOX_CODE\s*=/.test(line)) {
    return `MM_FOX_CODE = ${foxCode}`;
  }
  return line;
});

fs.writeFileSync(outPath, `${next.join('\n').replace(/\n+$/, '')}\n`);
console.log('write-ios-env-for-ci: wrote .ios.env with MM_FOX_CODE for Xcode plist substitution.');
