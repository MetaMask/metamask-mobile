import EngineService from '../core/EngineService';
import { Authentication } from '../core';
import LockManagerService from '../core/LockManagerService';
import { createStoreAndPersistor, store, persistor } from './abstracted-store';

/**
 * Populate store and persistor
 */
(async () => {
  await createStoreAndPersistor(() => {
    // Initialize services after persist is completed
    EngineService.initalizeEngine(store);
    Authentication.init(store);
    LockManagerService.init(store);
  });
})();

export { store, persistor };
