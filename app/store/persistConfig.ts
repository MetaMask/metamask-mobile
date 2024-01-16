import { createMigrate, createTransform } from 'redux-persist';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import MigratedStorage from '../redux/storage/MigratedStorage';
import { migrations, version } from './migrations';
import Logger from '../util/Logger';

const TIMEOUT = 40000;

const persistUserTransform = createTransform(
  // TODO: Add types for the 'user' slice
  (inboundState: any) => {
    const { initialScreen, isAuthChecked, ...state } = inboundState;
    // Reconstruct data to persist
    return state;
  },
  null,
  { whitelist: ['user'] },
);

interface PersistConfig {
  key: string;
  version?: number;
  blacklist?: string[];
  transforms?: any[];
  stateReconciler?: any;
  migrate?: any;
  timeout?: number;
  writeFailHandler?: (error: Error) => void;
}

const createPersistConfig = ({
  key,
  blacklist,
  transforms,
  migrate,
  timeout,
  writeFailHandler,
}: PersistConfig) => ({
  key,
  version,
  blacklist,
  storage: MigratedStorage(key),
  transforms,
  stateReconciler: autoMergeLevel2, // see "Merge Process" section for details.
  migrate,
  timeout,
  writeFailHandler,
});

export const rootPersistConfig = createPersistConfig({
  key: 'root',
  blacklist: ['onboarding', 'rpcEvents', 'accounts', 'engine'],
  transforms: [persistUserTransform],
  migrate: createMigrate(migrations, { debug: false }),
  timeout: TIMEOUT,
  writeFailHandler: (error: Error) =>
    Logger.error(error, { message: 'Error persisting data' }), // Log error if saving state fails
});

export default createPersistConfig;
