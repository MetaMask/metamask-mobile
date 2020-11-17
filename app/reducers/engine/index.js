import { REHYDRATE } from 'redux-persist';
import Engine from '../../core/Engine';
import { store } from '../../store';

const initialState = {
	backgroundState: {}
};

let engineInitialized = false;

function initalizeEngine(state = {}) {
	Engine.init(state);

	Engine.datamodel &&
		Engine.datamodel.subscribe(() => {
			if (!engineInitialized) {
				store.dispatch({ type: 'INIT_BG_STATE' });
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

	Engine.context.AssetsController.subscribe(() => {
		store.dispatch({ type: 'UPDATE_BG_STATE', key: 'AssetsController' });
	});

	Engine.context.AssetsDetectionController.subscribe(() => {
		store.dispatch({ type: 'UPDATE_BG_STATE', key: 'AssetsDetectionController' });
	});

	Engine.context.CurrencyRateController.subscribe(() => {
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
}

const engineReducer = (state = initialState, action) => {
	switch (action.type) {
		case REHYDRATE:
			initalizeEngine(action.payload && action.payload.engine && action.payload.engine.backgroundState);
			if (action.payload && action.payload.engine) {
				return { ...state, ...action.payload.engine };
			}
			return state;
		case 'INIT_BG_STATE':
			return { backgroundState: Engine.state };
		case 'UPDATE_BG_STATE':
			// eslint-disable-next-line no-case-declarations
			const newState = { ...state };
			newState.backgroundState[action.key] = Engine.state[action.key];
			return newState;
		default:
			return state;
	}
};

export default engineReducer;
