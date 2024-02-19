import { MigrationManifest, PersistedState } from 'redux-persist';

import migration00 from './000';
import migration01 from './001';
import migration02 from './002';
import migration03 from './003';
import migration04 from './004';
import migration05 from './005';
import migration06 from './006';
import migration07 from './007';
import migration08 from './008';
import migration09 from './009';
import migration10 from './010';
import migration11 from './011';
import migration12 from './012';
import migration13 from './013';
import migration14 from './014';
import migration15 from './015';
import migration16 from './016';
import migration17 from './017';
import migration18 from './018';
import migration19 from './019';
import migration20 from './020';
import migration21 from './021';
import migration22 from './022';
import migration23 from './023';
import migration24 from './024';
import migration25 from './025';
import migration26 from './026';
import migration27 from './027';
import migration28 from './028';
import migration29 from './029';

// We do not keep track of the old state
// We create this type for better readability
type OldState = PersistedState;

export const migrations: MigrationManifest = {
  0: migration00,
  1: migration01,
  2: migration02,
  3: migration03,
  4: migration04,
  5: migration05,
  6: migration06,
  7: migration07,
  8: migration08,
  9: migration09,
  10: migration10,
  11: migration11,
  12: migration12,
  13: migration13,
  14: migration14,
  15: migration15,
  16: migration16,
  17: migration17,
  18: migration18,
  19: migration19,
  20: migration20,
  21: migration21,
  22: migration22,
  23: migration23,
  24: migration24,
  25: migration25,
  26: migration26,
  27: migration27,
  28: migration28 as unknown as (state: PersistedState) => PersistedState,
  29: migration29 as unknown as (state: OldState) => PersistedState,
};

// The latest (i.e. highest) version number.
export const version = Object.keys(migrations).length - 1;
