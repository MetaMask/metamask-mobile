import { createMigrate } from 'redux-persist';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import MigratedStorage from '../redux/storage/MigratedStorage';
import { migrations, version } from './migrations';
import Logger from '../util/Logger';

const TIMEOUT = 40000;

const persistConfig = {
  key: 'root',
  version,
  whitelist: [],
  storage: MigratedStorage,
  stateReconciler: autoMergeLevel2, // see "Merge Process" section for details.
  migrate: createMigrate(migrations, { debug: false }),
  timeout: TIMEOUT,
  writeFailHandler: (error: Error) =>
    Logger.error(error, { message: 'Error persisting data' }), // Log error if saving state fails
};

export default persistConfig;
