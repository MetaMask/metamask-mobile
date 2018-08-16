import {
	AccountTrackerController,
	AddressBookController,
	BlockHistoryController,
	ComposableController,
	CurrencyRateController,
	KeyringController,
	NetworkController,
	NetworkStatusController,
	PhishingController,
	PreferencesController,
	ShapeShiftController,
	TokenRatesController,
	TransactionController
} from 'gaba';

import BlockTracker from 'eth-block-tracker';
import Encryptor from './Encryptor';

const encryptor = new Encryptor();

/**
 * Core controller responsible for composing other GABA controllers together
 * and exposing convenience methods for common wallet operations.
 */
class Engine {
	/**
	 * ComposableController reference containing all child controllers
	 */
	datamodel;

	/**
	 * Creates a CoreController instance
	 */
	constructor(initialState = {}) {
		if (!Engine.instance) {
			const keychain = new KeyringController(initialState.KeyringController, { encryptor });
			this.datamodel = new ComposableController([
				keychain,
				new AccountTrackerController(initialState.AccountTrackerController),
				new AddressBookController(initialState.AddressBookController),
				new BlockHistoryController(initialState.BlockHistoryController),
				new CurrencyRateController(initialState.CurrencyRateController),
				new NetworkController(initialState.NetworkController, { providerConfig: {} }),
				new NetworkStatusController(initialState.NetworkStatusController),
				new PhishingController(initialState.PhishingController),
				new PreferencesController(initialState.PreferencesController),
				new ShapeShiftController(initialState.ShapeShiftController),
				new TokenRatesController(initialState.TokenRatesController),
				new TransactionController(initialState.TransactionController, {
					sign: keychain.keyring.signTransaction.bind(keychain.keyring)
				})
			]);
			this.datamodel.context.NetworkController.subscribe(this.refreshNetwork);
			this.refreshNetwork();
			Engine.instance = this;
		}
		return Engine.instance;
	}

	/**
	 * Refreshes all controllers that depend on the network
	 */
	refreshNetwork = () => {
		const {
			AccountTrackerController,
			BlockHistoryController,
			NetworkController: { provider },
			TransactionController
		} = this.datamodel.context;
		provider.sendAsync = provider.sendAsync.bind(provider);
		const blockTracker = new BlockTracker({ provider });
		BlockHistoryController.configure({ provider, blockTracker });
		AccountTrackerController.configure({ provider, blockTracker });
		TransactionController.configure({ provider });
		blockTracker.start();
	};
}

let instance;

Object.freeze(instance);

export default {
	get: () => instance,
	init: initialState => {
		instance = new Engine(initialState);
		Object.freeze(instance);
		return instance;
	}
};
