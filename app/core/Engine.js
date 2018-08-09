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
	TokenRatesController
} from 'gaba';

import BlockTracker from 'eth-block-tracker';
import Encryptor from './Encryptor';

/**
 * Core controller responsible for composing other GABA controllers together
 * and exposing convenience methods for common wallet operations.
 */
const encryptor = new Encryptor();
class Engine {
	/**
	 * Child controller instances keyed by controller name
	 */
	api = {
		accountTracker: new AccountTrackerController(),
		addressBook: new AddressBookController(),
		blockHistory: new BlockHistoryController(),
		currencyRate: new CurrencyRateController(),
		keyring: new KeyringController(
			{},
			{
				encryptor
			}
		),
		network: new NetworkController(undefined, {
			providerConfig: {}
		}),
		networkStatus: new NetworkStatusController(),
		phishing: new PhishingController(),
		preferences: new PreferencesController(),
		shapeShift: new ShapeShiftController(),
		tokenRates: new TokenRatesController()
	};

	/**
	 * ComposableController reference containing all child controllers
	 */
	datamodel;

	/**
	 * Creates a CoreController instance
	 */
	constructor() {
		if (!Engine.instance) {
			this.datamodel = new ComposableController(this.api);
			this.api.network.subscribe(this.refreshNetwork);
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
			accountTracker,
			blockHistory,
			network: { provider }
		} = this.api;
		provider.sendAsync = provider.sendAsync.bind(provider);
		const blockTracker = new BlockTracker({ provider });
		blockHistory.configure({ provider, blockTracker });
		accountTracker.configure({ provider, blockTracker });
		blockTracker.start();
	};
}

const instance = new Engine();

Object.freeze(instance);

export default instance;
