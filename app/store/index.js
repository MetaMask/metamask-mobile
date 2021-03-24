import { createStore } from 'redux';
import { persistStore, persistReducer, createMigrate } from 'redux-persist';
import AsyncStorage from '@react-native-community/async-storage';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import rootReducer from '../reducers';
import { migrations, version } from './migrations';
import Logger from '../util/Logger';

const StorageShim = {
	async getItem(key) {
		try {
			await AsyncStorage.getItem(key);
		} catch (e) {
			Logger.log(e, 'getItem error');
		}
	},
	async setItem(key, value) {
		try {
			await AsyncStorage.setItem(key, value);
		} catch (e) {
			Logger.log(e, 'setItem error');
		}
	},
	async removeItem(key) {
		try {
			await AsyncStorage.removeItem(key);
		} catch (e) {
			Logger.log(e, 'removeItem error');
		}
	}
};

const persistConfig = {
	key: 'root',
	version,
	storage: StorageShim,
	stateReconciler: autoMergeLevel2, // see "Merge Process" section for details.
	migrate: createMigrate(migrations, { debug: false })
};

const pReducer = persistReducer(persistConfig, rootReducer);

export const store = createStore(pReducer);
export const persistor = persistStore(store);
