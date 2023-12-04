/* eslint-disable import/no-commonjs */
/* eslint-disable @typescript-eslint/no-require-imports */

import { MigrationManifest } from 'redux-persist';

export const migrations: MigrationManifest = {
  0: require('./000'),
  1: require('./001'),
  2: require('./002'),
  3: require('./003'),
  4: require('./004'),
  5: require('./005'),
  6: require('./006'),
  7: require('./007'),
  8: require('./008'),
  9: require('./009'),
  10: require('./010'),
  11: require('./011'),
  12: require('./012'),
  13: require('./013'),
  14: require('./014'),
  15: require('./015'),
  16: require('./016'),
  17: require('./017'),
  18: require('./018'),
  19: require('./019'),
  20: require('./020'),
  21: require('./021'),
  22: require('./022'),
  23: require('./023'),
  24: require('./024'),
  25: require('./025'),
  26: require('./026'),
  27: require('./027'),
};

// The latest (i.e. highest) version number.
export const version = Object.keys(migrations).length - 1;
