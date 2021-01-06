import { createStore } from 'redux';
import { getStoredState, persistStore, persistReducer, createMigrate } from 'redux-persist';
import AsyncStorage from '@react-native-community/async-storage';
import FileSystemStorage from 'redux-persist-filesystem-storage';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import rootReducer from '../reducers';
import AppConstants from '../core/AppConstants';
import Logger from '../util/Logger';
import { isEmpty } from 'lodash';

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
	},
	// migrate persist to FilesystemStorage
	2: async state => {
		// check if FilesystemStorage is empty
		if (isEmpty(state)) {
			try {
				// getStoredState from old AsyncStorage
				const asyncState = await getStoredState({
					key: 'root',
					// transforms: [encryptor],
					storage: AsyncStorage
				});
				if (!isEmpty(asyncState)) {
					console.log('Found async state!');
					console.log(asyncState);
					return asyncState;
				}
			} catch (error) {
				Logger.error(error, 'Migration: Failed to run storage migration.');
			}
		}
	}
};

const persistConfig = {
	key: 'root',
	version: 2,
	storage: FileSystemStorage,
	stateReconciler: autoMergeLevel2, // see "Merge Process" section for details.
	migrate: createMigrate(migrations, { debug: false })
};

const pReducer = persistReducer(persistConfig, rootReducer);

export const store = createStore(pReducer);
export const persistor = persistStore(store);
