import UntypedEngine from './Engine';

const UPDATE_BG_STATE_KEY = 'UPDATE_BG_STATE';
const INIT_BG_STATE_KEY = 'INIT_BG_STATE';

class EngineService {
	private engineInitialized = false;

	/**
	 * Initializer for the EngineService
	 *
	 * @param store - Redux store
	 */
	initalizeEngine = (store: any) => {
		const reduxState = store.getState?.();
		const state = reduxState?.engine?.backgroundState || {};
		const Engine = UntypedEngine as any;

		Engine.init(state);

		const controllers = [
			{ name: 'AccountTrackerController' },
			{ name: 'AddressBookController' },
			{ name: 'AssetsContractController' },
			{ name: 'CollectiblesController' },
			{ name: 'TokensController' },
			{ name: 'AssetsDetectionController' },
			{ name: 'KeyringController' },
			{ name: 'AccountTrackerController' },
			{ name: 'NetworkController' },
			{ name: 'PhishingController' },
			{ name: 'PreferencesController' },
			{ name: 'TokenBalancesController' },
			{ name: 'TokenRatesController' },
			{ name: 'TransactionController' },
			{ name: 'TypedMessageManager' },
			{ name: 'SwapsController' },
			{ name: 'TokenListController', key: `${Engine.context.TokenListController.name}:stateChange` },
			{ name: 'CurrencyRateController', key: `${Engine.context.CurrencyRateController.name}:stateChange` },
			{ name: 'GasFeeController', key: `${Engine.context.GasFeeController.name}:stateChange` },
		];

		Engine?.datamodel?.subscribe?.(() => {
			if (!this.engineInitialized) {
				store.dispatch({ type: INIT_BG_STATE_KEY });
				this.engineInitialized = true;
			}
		});

		controllers.forEach((controller) => {
			const { name, key = undefined } = controller;

			if (!key) {
				Engine.context[name].subscribe(() => {
					store.dispatch({ type: UPDATE_BG_STATE_KEY, key: name });
				});
			} else {
				Engine.controllerMessenger.subscribe(key, () => {
					store.dispatch({ type: UPDATE_BG_STATE_KEY, key: name });
				});
			}
		});
	};
}

/**
 * EngineService class used for initializing and subscribing to the engine controllers
 */
export default new EngineService();
