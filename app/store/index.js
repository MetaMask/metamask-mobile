import { createStore } from 'redux';
import { persistStore, persistReducer, createMigrate } from 'redux-persist';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import rootReducer from '../reducers';
import { migrations, version } from './migrations';

const persistConfig = {
	key: 'root',
	version,
	storage: FilesystemStorage,
	stateReconciler: autoMergeLevel2, // see "Merge Process" section for details.
	migrate: createMigrate(migrations, { debug: false })
};

const pReducer = persistReducer(persistConfig, rootReducer);

export const store = createStore(pReducer);
export const persistor = persistStore(store);
