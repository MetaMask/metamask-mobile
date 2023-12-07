import { createMigrate } from 'redux-persist';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import MigratedStorage from '../redux/storage/MigratedStorage';
import { migrations, version } from './migrations';
import Logger from '../util/Logger';

const TIMEOUT = 40000;

// const persistUserTransform = createTransform(
//   // TODO: Add types for the 'user' slice
//   (inboundState: any) => {
//     const { initialScreen, isAuthChecked, ...state } = inboundState;
//     // Reconstruct data to persist
//     return state;
//   },
//   null,
//   { whitelist: ['user'] },
// );

const persistConfig = {
  key: 'root',
  version,
  // blacklist: ['engine'],
  whitelist: [],
  storage: MigratedStorage,
  // transforms: [persistUserTransform],
  stateReconciler: autoMergeLevel2, // see "Merge Process" section for details.
  migrate: createMigrate(migrations, { debug: false }),
  timeout: TIMEOUT,
  writeFailHandler: (error: Error) =>
    Logger.error(error, { message: 'Error persisting data' }), // Log error if saving state fails
};

export default persistConfig;
