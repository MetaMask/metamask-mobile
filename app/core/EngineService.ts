import UntypedEngine from './Engine';

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

		Engine?.datamodel?.subscribe?.(() => {
			if (!this.engineInitialized) {
				store.dispatch({ type: 'INIT_BG_STATE' });
				this.engineInitialized = true;
			}
		});

		Engine.context.AccountTrackerController.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'AccountTrackerController' });
		});

		Engine.context.AddressBookController.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'AddressBookController' });
		});

		Engine.context.AssetsContractController.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'AssetsContractController' });
		});

		Engine.context.CollectiblesController.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'CollectiblesController' });
		});

		Engine.context.TokensController.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'TokensController' });
		});

		Engine.context.AssetsDetectionController.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'AssetsDetectionController' });
		});

		Engine.controllerMessenger.subscribe(`${Engine.context.TokenListController.name}:stateChange`, () => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'TokenListController' });
		});

		Engine.controllerMessenger.subscribe(`${Engine.context.CurrencyRateController.name}:stateChange`, () => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'CurrencyRateController' });
		});

		Engine.context.KeyringController.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'KeyringController' });
		});

		Engine.context.PersonalMessageManager.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'AccountTrackerController' });
		});

		Engine.context.NetworkController.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'NetworkController' });
		});

		Engine.context.PhishingController.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'PhishingController' });
		});

		Engine.context.PreferencesController.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'PreferencesController' });
		});

		Engine.context.TokenBalancesController.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'TokenBalancesController' });
		});

		Engine.context.TokenRatesController.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'TokenRatesController' });
		});

		Engine.context.TransactionController.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'TransactionController' });
		});

		Engine.context.TypedMessageManager.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'TypedMessageManager' });
		});

		Engine.context.SwapsController.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'SwapsController' });
		});

		Engine.controllerMessenger.subscribe(`${Engine.context.GasFeeController.name}:stateChange`, () => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'GasFeeController' });
		});
	};
}

/**
 * EngineService class used for initializing and subscribing to the engine controllers
 */
export default new EngineService();
