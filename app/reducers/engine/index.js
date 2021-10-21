'use strict';
import { REHYDRATE } from 'redux-persist';
import Engine from '../../core/Engine';
import { store } from '../../store';

const initialState = {
	backgroundState: {},
};

let engineInitialized = false;

function initalizeEngine(state = {}) {
	Engine.init(state);

	Engine.datamodel &&
		Engine.datamodel.subscribe(() => {
			if (!engineInitialized) {
				const { TokenListController, SwapsController, ...controllers } = Engine.state;
				const { tokenList, ...tokenListControllerState } = TokenListController;
				const {
					aggregatorMetadata,
					aggregatorMetadataLastFetched,
					chainCache,
					tokens,
					tokensLastFetched,
					topAssets,
					topAssetsLastFetched,
					...swapsControllerState
				} = SwapsController;
				const backgroundState = {
					...controllers,
					TokenListController: tokenListControllerState,
					SwapsController: swapsControllerState,
				};
				store.dispatch({ type: 'INIT_BG_STATE', payload: backgroundState });
				store.dispatch({
					type: 'UPDATE_TEMP_BG_STATE',
					payload: {
						TokenListController: {
							tokenList,
						},
						SwapsController: {
							aggregatorMetadata,
							aggregatorMetadataLastFetched,
							chainCache,
							tokens,
							tokensLastFetched,
							topAssets,
							topAssetsLastFetched,
						},
					},
				});
				engineInitialized = true;
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
		const controllerName = 'TokenListController';
		const { tokenList, ...tokenListControllerState } = Engine.state[controllerName];
		store.dispatch({ type: 'UPDATE_BG_STATE', key: controllerName, payload: tokenListControllerState });
		store.dispatch({ type: 'UPDATE_TEMP_CONTROLLER_STATE', key: controllerName, payload: { tokenList } });
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
		const controllerName = 'SwapsController';
		const {
			aggregatorMetadata,
			aggregatorMetadataLastFetched,
			chainCache,
			tokens,
			tokensLastFetched,
			topAssets,
			topAssetsLastFetched,
			...swapsControllerState
		} = Engine.state[controllerName];
		store.dispatch({ type: 'UPDATE_BG_STATE', key: controllerName, payload: swapsControllerState });
		store.dispatch({
			type: 'UPDATE_TEMP_CONTROLLER_STATE',
			key: controllerName,
			payload: {
				aggregatorMetadata,
				aggregatorMetadataLastFetched,
				chainCache,
				tokens,
				tokensLastFetched,
				topAssets,
				topAssetsLastFetched,
			},
		});
	});

	Engine.controllerMessenger.subscribe(`${Engine.context.GasFeeController.name}:stateChange`, () => {
		store.dispatch({ type: 'UPDATE_BG_STATE', key: 'GasFeeController' });
	});
}

const engineReducer = (state = initialState, action) => {
	const newState = state;
	switch (action.type) {
		case REHYDRATE:
			initalizeEngine(action.payload && action.payload.engine && action.payload.engine.backgroundState);
			if (action.payload && action.payload.engine) {
				return { ...newState, ...action.payload.engine };
			}
			return state;
		case 'INIT_BG_STATE':
			newState.backgroundState = action.payload;
			break;
		case 'UPDATE_BG_STATE':
			{
				const controllerState = action.payload;
				newState.backgroundState[action.key] = controllerState || Engine.state[action.key];
			}
			break;

		default:
	}
	return newState;
};

const tempEngineReducer = (state = initialState, action) => {
	const newState = { ...state };
	switch (action.type) {
		case 'UPDATE_TEMP_BG_STATE':
			newState.backgroundState = action.payload;
			break;
		case 'UPDATE_TEMP_CONTROLLER_STATE':
			{
				const controllerState = action.payload;
				newState.backgroundState[action.key] = controllerState;
			}
			break;
		default:
	}
	return newState;
};

export { engineReducer, tempEngineReducer };
