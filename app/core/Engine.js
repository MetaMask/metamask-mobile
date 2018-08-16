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
			this.datamodel = new ComposableController(
				[
					new KeyringController({ encryptor }, initialState.KeyringController),
					new AccountTrackerController(),
					new AddressBookController(),
					new BlockHistoryController(),
					new CurrencyRateController(),
					new NetworkController({ providerConfig: {} }),
					new NetworkStatusController(),
					new PhishingController(),
					new PreferencesController(),
					new ShapeShiftController(),
					new TokenRatesController(),
					new TransactionController()
				],
				initialState
			);

			const {
				KeyringController: { keyring },
				NetworkController: network,
				TransactionController: transaction
			} = this.datamodel.context;

			transaction.configure({ sign: keyring.signTransaction.bind(keyring) });
			network.subscribe(this.refreshNetwork);
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

export default {
	get context() {
		return instance.datamodel.context;
	},
	get state() {
		const {
			AccountTrackerController,
			CurrencyRateController,
			KeyringController,
			NetworkController,
			NetworkStatusController,
			PreferencesController,
			TokenRatesController,
			TransactionController
		} = instance.datamodel.state;

		return {
			AccountTrackerController,
			CurrencyRateController,
			KeyringController,
			NetworkController,
			NetworkStatusController,
			PreferencesController,
			TokenRatesController,
			TransactionController
		};
	},
	get datamodel() {
		return instance.datamodel;
	},
	init(state) {
		instance = new Engine(state);
		Object.freeze(instance);
		return instance;
	}
};
