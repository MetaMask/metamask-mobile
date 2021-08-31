import { createStore } from 'redux';
import { persistStore, persistReducer, createMigrate } from 'redux-persist';
import AsyncStorage from '@react-native-community/async-storage';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import rootReducer from '../reducers';
import { migrations, version } from './migrations';
import Logger from '../util/Logger';

const MigratedStorage = {
	async getItem(key) {
		try {
			const res = await FilesystemStorage.getItem(key);
			if (res) {
				// Using new storage system
				return res;
			}
		} catch {
			//Fail silently
		}

		// Using old storage system, should only happen once
		try {
			const res = await AsyncStorage.getItem(key);
			if (res) {
				// Using old storage system
				return res;
			}
		} catch (error) {
			Logger.error(error, { message: 'Failed to run migration' });
			throw new Error('Failed async storage storage fetch.');
		}
	},
	async setItem(key, value) {
		return await FilesystemStorage.setItem(key, value);
	},
	async removeItem(key) {
		try {
			return await FilesystemStorage.removeItem(key);
		} catch (error) {
			Logger.error(error, { message: 'Failed to remove item' });
		}
	}
};

const persistConfig = {
	key: 'root',
	version,
	blacklist: ['onboarding', 'analytics'],
	storage: MigratedStorage,
	stateReconciler: autoMergeLevel2, // see "Merge Process" section for details.
	migrate: createMigrate(migrations, { debug: false }),
	/**
	 * fix bug: https://github.com/MetaMask/metamask-mobile/issues/2100
	 * 
	 * reason: redux-persist load storage data by 'getItem' API with a timeout (5 seconds default) when app ’cold start',
	 * on some old devices, I/O is slow and 'readfile' operation may take long time Occasionally, when this happened, timeout
	 * will lead to redux-persist rehydrate state with undefined and an Error(https://github.com/rt2zz/redux-persist/blob/master/src/persistReducer.js#89).
	 * 
	 * solution: the easy way to fix is to set a big timeout on config, Go further, we could save 'keyring' etc some important
	 * data to separate files or backup for this. the second way is not complicated, we could set
	 * serialize and deserialize to false to get JSON object and modify setItem/getItem API to save/load data.
	 */
	timeout: 30000,
	writeFailHandler: error => Logger.error(error, { message: 'Error persisting data' }) // Log error if saving state fails
};

const pReducer = persistReducer(persistConfig, rootReducer);

export const store = createStore(pReducer);
export const persistor = persistStore(store);
