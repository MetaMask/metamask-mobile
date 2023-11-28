/* eslint-disable import/no-commonjs */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */

import { MigrationManifest } from 'redux-persist';

// The latest (i.e. highest) version number.
export const version = 27;

export const migrations: MigrationManifest = {};

for (let i = 0; i < version; i++) {
  const filename = `${i}`.padStart(3, '0');
  try {
    migrations[i] = require(`./${filename}`).migration;
  } catch (e) {
    throw new Error(
      `No migration found for version ${i}. Did you skip a version?`,
    );
  }
}
