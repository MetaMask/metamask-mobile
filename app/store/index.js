import { createStore } from 'redux';
import { persistStore, persistReducer, createMigrate } from 'redux-persist';
import AsyncStorage from '@react-native-community/async-storage';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import rootReducer from '../reducers';
import AppConstants from '../core/AppConstants';

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
	// Combine the transactions reducer and newTransaction reducer
	2: state => {
		const newState = { ...state };
		delete newState.newTransaction;
		return newState;
	}
};

const persistConfig = {
	key: 'root',
	version: 1,
	storage: AsyncStorage,
	stateReconciler: autoMergeLevel2, // see "Merge Process" section for details.
	migrate: createMigrate(migrations, { debug: false })
};

const pReducer = persistReducer(persistConfig, rootReducer);

export const store = createStore(pReducer);
export const persistor = persistStore(store);
