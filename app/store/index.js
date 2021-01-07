import { createStore } from 'redux';
import { persistStore, persistReducer, createMigrate } from 'redux-persist';
import AsyncStorage from '@react-native-community/async-storage';
import FileSystemStorage from 'redux-persist-filesystem-storage';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import rootReducer from '../reducers';
import AppConstants from '../core/AppConstants';
// import Logger from '../util/Logger';
// import { isEmpty } from 'lodash';

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
		const res = await AsyncStorage.getItem(key);
		AsyncStorage.setItem(key, ''); // clear old storage
		return res;
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

const migrations = {
	// Needed after https://github.com/MetaMask/controllers/pull/152
	0: state => {
		const addressBook = state.engine.backgroundState.AddressBookController.addressBook;
		const migratedAddressBook = {};
		Object.keys(addressBook).forEach(address => {
			const chainId = addressBook[address].chainId.toString();
			migratedAddressBook[chainId]
				? (migratedAddressBook[chainId] = { ...migratedAddressBook[chainId], [address]: addressBook[address] })
				: (migratedAddressBook[chainId] = { [address]: addressBook[address] });
		});
		state.engine.backgroundState.AddressBookController.addressBook = migratedAddressBook;
		return state;
	},
	// MakerDAO DAI => SAI
	1: state => {
		const tokens = state.engine.backgroundState.AssetsController.tokens;
		const migratedTokens = [];
		tokens.forEach(token => {
			if (token.symbol === 'DAI' && token.address.toLowerCase() === AppConstants.SAI_ADDRESS.toLowerCase()) {
				token.symbol = 'SAI';
			}
			migratedTokens.push(token);
		});
		state.engine.backgroundState.AssetsController.tokens = migratedTokens;

		return state;
	}
};

const persistConfig = {
	key: 'root',
	version: 1,
	storage: MigratedStorage,
	stateReconciler: autoMergeLevel2, // see "Merge Process" section for details.
	migrate: createMigrate(migrations, { debug: false })
};

const pReducer = persistReducer(persistConfig, rootReducer);

export const store = createStore(pReducer);
export const persistor = persistStore(store);
