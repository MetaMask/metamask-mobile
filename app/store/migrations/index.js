const HIGHEST_VERSION = 26;

const migrations = {};

for (let i = 1; i <= HIGHEST_VERSION; i++) {
  const migrationPath = `./${String(i).padStart(3, '0')}`;
  migrations[i] = require(migrationPath);
}

export default migrations;
