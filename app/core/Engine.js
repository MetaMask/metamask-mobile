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
	constructor() {
		if (!Engine.instance) {
			const keychain = new KeyringController({}, { encryptor });
			this.datamodel = new ComposableController([
				keychain,
				new AccountTrackerController(),
				new AddressBookController(),
				new BlockHistoryController(),
				new CurrencyRateController(),
				new NetworkController(undefined, { providerConfig: {} }),
				new NetworkStatusController(),
				new PhishingController(),
				new PreferencesController(),
				new ShapeShiftController(),
				new TokenRatesController(),
				new TransactionController(undefined, { sign: keychain.keyring.signTransaction.bind(keychain.keyring) })
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

const instance = new Engine();

Object.freeze(instance);

export default instance;
