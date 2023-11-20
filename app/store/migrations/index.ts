import { MigrationManifest } from 'redux-persist';

import m0 from './000';
import m1 from './001';
import m2 from './002';
import m3 from './003';
import m4 from './004';
import m5 from './005';
import m6 from './006';
import m7 from './007';
import m8 from './008';
import m9 from './009';
import m10 from './010';
import m11 from './011';
import m12 from './012';
import m13 from './013';
import m14 from './014';
import m15 from './015';
import m16 from './016';
import m17 from './017';
import m18 from './018';
import m19 from './019';
import m20 from './020';
import m21 from './021';
import m22 from './022';
import m23 from './023';
import m24 from './024';
import m25 from './025';
import m26 from './026';

const allMigrations = [
  m0,
  m1,
  m2,
  m3,
  m4,
  m5,
  m6,
  m7,
  m8,
  m9,
  m10,
  m11,
  m12,
  m13,
  m14,
  m15,
  m16,
  m17,
  m18,
  m19,
  m20,
  m21,
  m22,
  m23,
  m24,
  m25,
  m26,
];

export const version = allMigrations.length - 1;

const migrations: MigrationManifest = {};

allMigrations.forEach((m, i) => {
  migrations[i] = m;
});

export default migrations;
