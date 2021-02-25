import { createStore } from 'redux';
import { persistStore, persistReducer, createMigrate } from 'redux-persist';
import AsyncStorage from '@react-native-community/async-storage';
import FileSystemStorage from 'redux-persist-filesystem-storage';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import rootReducer from '../reducers';
import { migrations, version } from './migrations';

import Logger from '../util/Logger';

/*
 * At some point in the not so distant future it'll be safe to delete this one time migration
 */
const MigratedStorage = {
	async getItem(key) {
		try {
			const res = await FileSystemStorage.getItem(key);
			if (res) {
				// Using new storage system
				return res;
			}
		} catch (e) {
			//
		}

		// Using old storage system, should only happen once
		try {
			const res = await AsyncStorage.getItem(key);
			AsyncStorage.setItem(key, ''); // clear old storage
			return res;
		} catch (e) {
			Logger.log('Failed to run migration', e);
		}
	},
	setItem(key, value) {
		return FileSystemStorage.setItem(key, value);
	},
	removeItem(key) {
		try {
			return FileSystemStorage.removeItem(key);
		} catch (e) {
			//
		}
	}
};

const persistConfig = {
	key: 'root',
	version,
	storage: MigratedStorage,
	stateReconciler: autoMergeLevel2, // see "Merge Process" section for details.
	migrate: createMigrate(migrations, { debug: false })
};

const pReducer = persistReducer(persistConfig, rootReducer);

export const store = createStore(pReducer);
export const persistor = persistStore(store);
