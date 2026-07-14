/* @ts-check */

// This file is used to define, among other configuration, rules that Yarn will
// execute when you run `yarn constraints`. These rules primarily check the
// manifests of each package in the monorepo to ensure they follow a standard
// format, but also check the presence of certain files as well.

const { defineConfig } = require('@yarnpkg/types');

/**
 * Aliases for the Yarn type definitions, to make the code more readable.
 *
 * @typedef {import('@yarnpkg/types').Yarn.Constraints.Yarn} Yarn
 * @typedef {import('@yarnpkg/types').Yarn.Constraints.Workspace} Workspace
 * @typedef {import('@yarnpkg/types').Yarn.Constraints.Dependency} Dependency
 * @typedef {import('@yarnpkg/types').Yarn.Constraints.DependencyType} DependencyType
 */

/**
 * Expect that the workspace has the given field, and that it is a non-null
 * value. If the field is not present, or is null, this will log an error, and
 * cause the constraint to fail.
 *
 * If a value is provided, this will also verify that the field is equal to the
 * given value.
 *
 * @param {Workspace} workspace - The workspace to check.
 * @param {string} field - The field to check.
 * @param {any} [value] - The value to check.
 */
function expectWorkspaceField(workspace, field, value) {
  const fieldValue = workspace.manifest[field];
  if (fieldValue === null) {
    workspace.error(`Missing required field "${field}".`);
    return;
  }

  if (value) {
    workspace.set(field, value);
  }
}

/**
 * Expect that the workspace has a package manager set, and that it is Yarn with
 * a sha256 hash.
 *
 * @param {Workspace} workspace - The workspace to check.
 */
function expectYarnPackageManager(workspace) {
  expectWorkspaceField(workspace, 'packageManager');

  const { packageManager } = workspace.manifest;
  if (!packageManager.startsWith('yarn@')) {
    workspace.error(
      `Expected packageManager to start with "yarn@<version>", but got "${packageManager}".`,
    );
  }

  if (!packageManager.includes('sha256')) {
    workspace.error(
      `Expected packageManager to include a sha256 hash, but got "${packageManager}".`,
    );
  }
}

module.exports = defineConfig({
  async constraints({ Yarn }) {
    const workspace = Yarn.workspace();

    // The package must specify Yarn as the package manager, with a sha256 hash.
    expectYarnPackageManager(workspace);
  },
});
