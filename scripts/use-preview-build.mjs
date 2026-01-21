#!/usr/bin/env node

// This script is copied between Extension and Mobile,
// and it needs to stay relatively the same between the two.
/* eslint-disable import/no-nodejs-modules,import/no-namespace,no-console */

import { structUtils } from '@yarnpkg/core';
import { ESLint } from 'eslint';
import { execa } from 'execa';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as semver from 'semver';
import yargs from 'yargs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * The scope that all MetaMask packages are published under.
 */
const METAMASK_NPM_SCOPE = 'metamask';

/**
 * Valid values for the `--type` option.
 * @typedef {'breaking' | 'non-breaking'} ChangeType
 */

/**
 * Captures the arguments passed to this script.
 * @typedef {Object} CommandLineArguments
 * @property {string} packageName
 * @property {string} previewNpmScope
 * @property {string} previewVersion
 * @property {ChangeType} type
 */

/**
 * The contents of a package's `package.json`.
 * @typedef {Object} Manifest
 * @property {string} name
 * @property {Record<string, string>} [dependencies]
 * @property {Record<string, string>} [devDependencies]
 * @property {Record<string, string>} [resolutions]
 */

/**
 * The shape of each line returned by `yarn why --json`.
 * @typedef {Object} YarnWhyEntry
 * @property {string} value
 * @property {Record<string, { locator: string; descriptor: string }>} children
 */

/**
 * Different interpretations of a SemVer-compatible version range,
 * e.g. `^1.2.3`.
 * @typedef {Object} ParsedVersionRange
 * @property {semver.Range} semverRange
 * @property {semver.SemVer} primarySemver
 * @property {number} majorVersion
 * @property {string} string
 */

/**
 * Parses command line arguments using yargs.
 *
 * @returns {Promise<CommandLineArguments>} The parsed command line arguments.
 */
async function parseArgs() {
  const argv = await yargs(process.argv.slice(2))
    .usage(
      'Usage: $0 <package-name> <preview-version> --type <breaking|non-breaking> [options]',
    )
    .positional('package-name', {
      describe: 'The name of the package',
      type: 'string',
    })
    .option('preview-npm-scope', {
      describe: 'NPM organization for preview builds',
      type: 'string',
      default: 'metamask-previews',
    })
    .positional('preview-version', {
      describe: 'The preview version string (e.g., "1.1.4-preview-e2df9b4")',
      type: 'string',
    })
    .option('type', {
      alias: 't',
      describe: 'Type of change',
      choices: ['breaking', 'non-breaking'],
      demandOption: true,
    })
    .example(
      '$0 @metamask/controller-utils 1.1.4-preview-e2df9b4 --type non-breaking',
      'Add resolutions for non-breaking changes',
    )
    .example(
      '$0 @metamask/network-controller 12.4.9-preview-e2df9b4 --type breaking',
      'Add resolution for breaking changes',
    )
    .check((args) => {
      const positionals = args._;
      if (positionals.length < 2) {
        throw new Error(
          'Both <package-name> and <preview-version> are required',
        );
      }
      return true;
    })
    .string('_')
    .help().argv;

  const [uncorrectedPackageName, previewVersion] = argv._;

  const packageName = uncorrectedPackageName.startsWith(
    `@${METAMASK_NPM_SCOPE}/`,
  )
    ? uncorrectedPackageName
    : `@${METAMASK_NPM_SCOPE}/${uncorrectedPackageName}`;
  const previewNpmScope = argv.previewNpmScope.startsWith('@')
    ? argv.previewNpmScope.slice(1)
    : argv.previewNpmScope;

  return {
    packageName,
    previewNpmScope,
    previewVersion,
    type: argv.type,
  };
}

/**
 * Reads and parses a `package.json` file.
 *
 * @param {string} manifestPath - Path to the `package.json` file.
 * @returns {Promise<Manifest>} The parsed `package.json` contents.
 */
async function readManifest(manifestPath) {
  const content = await fs.promises.readFile(manifestPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Writes a `package.json` file.
 *
 * @param {string} manifestPath - Path to the `package.json` file.
 * @param {Manifest} contents - The package.json contents to write.
 * @returns {Promise<void>}
 */
async function writeManifest(manifestPath, contents) {
  await fs.promises.writeFile(
    manifestPath,
    `${JSON.stringify(contents, null, 2)}\n`,
    'utf-8',
  );
}

/**
 * Formats a `package.json` file.
 *
 * @param {string} manifestPath - Path to the `package.json` file.
 * @returns {Promise<void>}
 */
async function formatManifest(manifestPath) {
  const eslint = new ESLint({
    // This is necessary in order to run this script outside of this project,
    // e.g., for testing purposes.
    cwd: path.resolve(__dirname, '..'),
    ignore: false,
    fix: true,
  });
  console.log('Formatting package.json...');
  const results = await eslint.lintFiles(manifestPath);
  await ESLint.outputFixes(results);
}

/**
 * Saves a formatted version of the given `package.json` with the given
 * resolutions updated.
 *
 * @param {string} manifestPath - The path to `package.json`.
 * @param {Record<string, string>} resolutions - The new resolutions to load into `package.json`.
 * @returns {Promise<void>}
 */
async function updateResolutionsInManifest(manifestPath, resolutions) {
  console.log('Adding resolutions:');
  const manifest = await readManifest(manifestPath);
  for (const [key, value] of Object.entries(resolutions)) {
    console.log(`  "${key}": "${value}"`);
  }

  await writeManifest(manifestPath, {
    ...manifest,
    resolutions: {
      ...manifest.resolutions,
      ...resolutions,
    },
  });
  // await formatManifest(manifestPath);
  await installDependencies();
}

/**
 * Verifies that the the given version range is SemVer-compatible and that it is
 * a version range that we can handle, and then parses the major version from
 * the version range.
 *
 * Currently, this is the list of supported version ranges:
 *
 * - "18.0.0"
 * - "=18.0.0"
 * - ">=18.0.0,<19.0.0"
 * - "^18.0.0"
 *
 * @param {string} versionRange - The version range.
 * @returns {ParsedVersionRange} A semver.Range that represents the version range.
 * @throws {Error} If the version range is not supported.
 */
function parseVersionRange(versionRange) {
  const semverRange = new semver.Range(versionRange);

  if (
    !(
      semverRange.set.length === 1 &&
      semverRange.set[0] !== undefined &&
      ((semverRange.set[0].length === 2 &&
        semverRange.set[0][0] !== undefined &&
        semverRange.set[0][1] !== undefined &&
        semverRange.set[0][0].operator === '>=' &&
        semverRange.set[0][1].operator === '<' &&
        semverRange.set[0][1].semver.major ===
          semverRange.set[0][0].semver.major + 1) ||
        (semverRange.set[0].length === 1 &&
          semverRange.set[0][0] !== undefined &&
          (semverRange.set[0][0].operator === '' ||
            semverRange.set[0][0].operator === '=')))
    )
  ) {
    throw new Error(`Unsupported version range: ${versionRange}`);
  }

  const primarySemver = semverRange.set[0][0].semver;
  const { major } = primarySemver;

  return {
    semverRange,
    primarySemver,
    majorVersion: major,
    string: versionRange,
  };
}

/**
 * Compare two SemVer-compatible, supported version ranges, for use in sorting.
 *
 * @param {ParsedVersionRange} a - The first version range as parsed via `parseVersionRange`.
 * @param {ParsedVersionRange} b - The second version range as parsed via `parseVersionRange`.
 * @returns {number} 1, 0, or -1 depending on whether the first version range should be
 * placed before or after the second, or whether no swapping should occur.
 */
function compareParsedVersionRanges(a, b) {
  return semver.compare(a.primarySemver, b.primarySemver);
}

/**
 * Sorts the given set of parsed version ranges.
 *
 * @param {ParsedVersionRange[]} parsedVersionRanges - The list of parsed version ranges to sort.
 * @returns {ParsedVersionRange[]} The sorted list of version ranges.
 */
function sortParsedVersionRanges(parsedVersionRanges) {
  return [...parsedVersionRanges].sort((a, b) =>
    compareParsedVersionRanges(a, b),
  );
}

/**
 * Check whether the given descriptor of a package (as would come from
 * `dependencies`) represents a patch. As we do not support adding preview
 * builds for patches at this time, throw an error.
 *
 * @param {string | Descriptor} descriptor - The right-hand side of an entry in `dependencies`, either
 * unparsed or parsed via Yarn's `parseDescriptor` function.
 * @param {string} name - The name of the dependency.
 * @returns {void}
 * @throws {Error} If the descriptor of the dependency starts with `patch:`.
 */
function validateNonPatchDescriptor(descriptor, name) {
  const isPatched =
    typeof descriptor === 'string'
      ? descriptor.startsWith('patch:')
      : descriptor.name === 'patch:';

  if (isPatched) {
    throw new Error(
      `It looks like ${name} is patched. You'll need to configure a preview build for this dependency yourself. Please see the documentation on how to do this here: https://github.com/MetaMask/core/tree/main/docs/processes/preview-builds.md`,
    );
  }
}

/**
 * Parses the given string as if it were the right-hand side of a dependency
 * entry (e.g. `npm:@metamask/transaction-controller@^12.3.4`) and extracts the
 * version range specified within it.
 *
 * Currently does not support patched dependencies.
 *
 * @param {string} rawDescriptor - The string to parse.
 * @param {string} dependencyName - The name of the dependency that `rawDescriptor`
 * represents.
 * @returns {ParsedVersionRange} A parsed representation of the version range within `rawDescriptor`.
 * @throws {Error} If `rawDescriptor` represents a patched dependency.
 */
function getParsedVersionRangeForDescriptor(rawDescriptor, dependencyName) {
  validateNonPatchDescriptor(rawDescriptor, dependencyName);

  const range = structUtils.parseRange(rawDescriptor);
  // TODO - Support patches
  // if (range.protocol === 'patch:' && range.source !== null) {
  //   const descriptor = structUtils.parseDescriptor(range.source);
  //   const innerRange = structUtils.parseRange(descriptor.range);
  //   return parseVersionRange(innerRange.selector);
  // }
  return parseVersionRange(range.selector);
}

/**
 * Gets the version range for a dependency in `dependencies`.
 *
 * @param {Manifest} manifest - The contents of `package.json`.
 * @param {string} packageName - The name of the package.
 * @returns {ParsedVersionRange} The version range.
 */
function getVersionRangeForDependency(manifest, packageName) {
  const rawDescriptor = manifest.dependencies?.[packageName];
  if (!rawDescriptor) {
    throw new Error(`Could not find ${packageName} in dependencies`);
  }
  return getParsedVersionRangeForDescriptor(rawDescriptor, packageName);
}

/**
 * Looks up the given package name in `dependencies` and checks that it is not
 * patched. As we do not support adding preview builds for patches at this time,
 * throw an error.
 *
 * @param {string} packageName - The name of the packege.
 * @param {string} manifestPath - The path to `package.json`
 * @returns {Promise<void>}
 * @throws {Error} If there is no entry in `dependencies` for the package.
 * @throws {Error} If the version range starts with `patch:`.
 */
async function validateDependencyNotPatched(packageName, manifestPath) {
  const manifest = await readManifest(manifestPath);
  const rawDescriptor = manifest.dependencies?.[packageName];
  if (!rawDescriptor) {
    throw new Error(`Could not find ${packageName} in dependencies`);
  }
  validateNonPatchDescriptor(rawDescriptor, packageName);
}

/**
 * Updates `package.json` to remove resolutions for preview builds that match
 * the given package name.
 *
 * @param {string} packageName - The name of a package.
 * @param {string} previewNpmScope - The NPM scope of the preview build.
 * @param {string} manifestPath - The path to `package.json`.
 * @returns {Promise<void>}
 */
async function removeExistingPreviewBuildResolutions(
  packageName,
  previewNpmScope,
  manifestPath,
) {
  const manifest = await readManifest(manifestPath);
  const { resolutions } = manifest;
  const packageNameWithoutScope = packageName.replace(
    `@${METAMASK_NPM_SCOPE}/`,
    '',
  );

  const resolutionsToRemove = Object.entries(resolutions ?? {}).reduce(
    (obj, [resolutionName, resolutionValue]) => {
      const range = structUtils.parseRange(resolutionValue);
      if (range.protocol === 'npm:') {
        const descriptor = structUtils.parseDescriptor(range.selector);
        if (
          descriptor.scope === previewNpmScope &&
          descriptor.name === packageNameWithoutScope
        ) {
          return { ...obj, [resolutionName]: resolutionValue };
        }
      }
      return obj;
    },
    {},
  );

  if (
    Object.keys(resolutionsToRemove).length === 0 ||
    resolutions === undefined
  ) {
    return;
  }

  console.log('Removing resolutions for existing preview builds:');
  for (const [key, value] of Object.entries(resolutionsToRemove)) {
    console.log(`  "${key}": "${value}"`);
  }

  const newResolutions = Object.keys(resolutionsToRemove).reduce(
    (workingResolutions, resolutionName) => {
      if (resolutionName in workingResolutions) {
        const clone = { ...workingResolutions };
        delete clone[resolutionName];
        return clone;
      }
      return workingResolutions;
    },
    resolutions,
  );
  await writeManifest(manifestPath, {
    ...manifest,
    resolutions: newResolutions,
  });
  // await formatManifest(manifestPath);
  await installDependencies();

  console.log('');
}

/**
 * Uses `yarn why` to get all version ranges of the given package that are being
 * used across the dependency tree and which are compatible with the given major
 * version.
 *
 * @param {string} packageName - The name of a package.
 * @param {number} majorVersion - A major version of the package.
 * @returns {Promise<Set<ParsedVersionRange>>} An array of unique version ranges.
 */
async function getAllCompatibleVersionRangesAcrossDependencyTree(
  packageName,
  majorVersion,
) {
  const { stdout } = await execa('yarn', ['why', packageName, '--json']);

  const parsedVersionRanges = new Set();
  const lines = stdout.trim().split('\n');

  for (const line of lines) {
    /** @type {YarnWhyEntry} */
    const entry = JSON.parse(line);

    const parentLocator = structUtils.parseLocator(entry.value);
    if (parentLocator.reference === 'workspace:.') {
      // Skip dependencies or resolutions defined directly in the project's
      // `package.json`, as we already know what they are
      continue;
    }

    for (const child of Object.values(entry.children)) {
      const devirtualizedDescriptor = structUtils.ensureDevirtualizedDescriptor(
        structUtils.parseDescriptor(child.descriptor),
      );

      const parsedVersionRange = getParsedVersionRangeForDescriptor(
        structUtils.stringifyDescriptor(devirtualizedDescriptor),
        packageName,
      );

      if (majorVersion === parsedVersionRange.majorVersion) {
        parsedVersionRanges.add(parsedVersionRange);
      }
    }
  }

  return parsedVersionRanges;
}

/**
 * Computes resolutions necessary to add a preview build which is expected to
 * have breaking changes.
 *
 * In this case, there will be one resolution which overrides the given
 * package name ONLY at the root package level.
 *
 * @param {Object} args - The arguments.
 * @param {string} args.packageName - The name of the package to add resolutions for.
 * @param {string} args.previewNpmScope - The NPM scope of the preview build.
 * @param {string} args.previewVersion - The preview build version to use.
 * @param {string} args.manifestPath - Path to the package.json file.
 * @returns {Promise<Record<string, string>>} The resulting resolutions.
 */
async function getResolutionsForBreakingPreviewBuilds({
  packageName,
  previewNpmScope,
  previewVersion,
  manifestPath,
}) {
  const manifest = await readManifest(manifestPath);
  const rootPackageName = manifest.name;
  const parsedVersionRange = getVersionRangeForDependency(
    manifest,
    packageName,
  );

  const resolutionKey = `${rootPackageName}@workspace:./${packageName}@${parsedVersionRange.string}`;
  const resolutionValue = `npm:${packageName.replace(`@${METAMASK_NPM_SCOPE}/`, `@${previewNpmScope}/`)}@${previewVersion}`;
  return {
    [resolutionKey]: resolutionValue,
  };
}

/**
 * Computes resolutions necessary to add a preview build which is expected to
 * have non-breaking changes.
 *
 * In this case, there may be multiple resolutions, one for each version of the
 * package in the dependency tree that is compatible with the version range
 * specified in `dependencies`.
 *
 * @param {Object} args - The arguments.
 * @param {string} args.packageName - The name of the package to add resolutions for.
 * @param {string} args.previewNpmScope - The NPM scope of the preview build.
 * @param {string} args.previewVersion - The preview build version to use.
 * @param {string} args.manifestPath - Path to the package.json file.
 * @returns {Promise<Record<string, string>>} The resulting resolutions.
 */
async function getResolutionsForNonBreakingPreviewBuilds({
  packageName,
  previewNpmScope,
  previewVersion,
  manifestPath,
}) {
  const manifest = await readManifest(manifestPath);
  const parsedVersionRange = getVersionRangeForDependency(
    manifest,
    packageName,
  );

  const compatibleVersionRanges =
    await getAllCompatibleVersionRangesAcrossDependencyTree(
      packageName,
      parsedVersionRange.majorVersion,
    );
  const parsedVersionRangesToAdd = new Set([
    ...compatibleVersionRanges,
    parsedVersionRange,
  ]);
  const sortedParsedVersionRangesToAdd = sortParsedVersionRanges([
    ...parsedVersionRangesToAdd,
  ]);

  return sortedParsedVersionRangesToAdd.reduce(
    (obj, parsedVersionRangeToAdd) => {
      const resolutionKey = `${packageName}@${parsedVersionRangeToAdd.string}`;
      const resolutionValue = `npm:${packageName.replace(`@${METAMASK_NPM_SCOPE}/`, `@${previewNpmScope}/`)}@${previewVersion}`;
      return { ...obj, [resolutionKey]: resolutionValue };
    },
    {},
  );
}

/**
 * Installs the resolutions just added.
 * @returns {Promise<void>}
 */
async function installDependencies() {
  console.log('Running `yarn install`...');
  await execa('yarn', ['install']);
}

/**
 * Main entry point for the script.
 * @returns {Promise<void>}
 */
async function main() {
  const { packageName, previewNpmScope, previewVersion, type } =
    await parseArgs();

  const manifestPath = path.join(process.cwd(), 'package.json');

  await validateDependencyNotPatched(packageName, manifestPath);

  await removeExistingPreviewBuildResolutions(
    packageName,
    previewNpmScope,
    manifestPath,
  );

  const newResolutions =
    type === 'breaking'
      ? await getResolutionsForBreakingPreviewBuilds({
          packageName,
          previewVersion,
          previewNpmScope,
          manifestPath,
        })
      : await getResolutionsForNonBreakingPreviewBuilds({
          packageName,
          previewVersion,
          previewNpmScope,
          manifestPath,
        });
  await updateResolutionsInManifest(manifestPath, newResolutions);

  console.log('\nDone!');
}

// Run this script.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
