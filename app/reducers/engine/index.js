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
			if(!engineInitialized){
				store.dispatch({ type: 'INIT_BG_STATE'});
				engineInitialized = true;
			}
		});

		Engine.context.AccountTrackerController.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'AccountTrackerController' });
			console.log('AccountTrackerController state updated');
		});

		Engine.context.AddressBookController.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'AddressBookController' });
			console.log('AddressBookController state updated');
		});

		Engine.context.AssetsContractController.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'AssetsContractController' });
			console.log('AssetsContractController state updated');
		});

		Engine.context.AssetsDetectionController.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'AssetsDetectionController' });
			console.log('AssetsDetectionController state updated');
		});

		Engine.context.CurrencyRateController.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'CurrencyRateController' });
			console.log('CurrencyRateController state updated');
		});

		Engine.context.KeyringController.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'KeyringController' });
			console.log('KeyringController state updated');
		});

		Engine.context.PersonalMessageManager.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'AccountTrackerController' });
			console.log('PersonalMessageManager state updated');
		});

		Engine.context.NetworkController.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'NetworkController' });
			console.log('NetworkController state updated');
		});

		Engine.context.NetworkStatusController.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'NetworkStatusController' });
			console.log('NetworkStatusController state updated');
		});

		Engine.context.PhishingController.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'PhishingController' });
			console.log('PhishingController state updated');
		});

		Engine.context.PreferencesController.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'PreferencesController' });
			console.log('PreferencesController state updated');
		});

		Engine.context.ShapeShiftController.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'ShapeShiftController' });
			console.log('ShapeShiftController state updated');
		});

		Engine.context.TokenBalancesController.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'TokenBalancesController' });
			console.log('TokenBalancesController state updated');
		});

		Engine.context.TokenRatesController.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'TokenRatesController' });
			console.log('TokenRatesController state updated');
		});

		Engine.context.TransactionController.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'TransactionController' });
			console.log('TransactionController state updated');
		});

		Engine.context.TypedMessageManager.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE', key: 'TypedMessageManager' });
			console.log('TypedMessageManager state updated');
		});

}

const engineReducer = (state = initialState, action) => {
	switch (action.type) {
		case REHYDRATE:
			initalizeEngine(action.payload && action.payload.engine && action.payload.engine.backgroundState);
			if(action.payload && action.payload.engine ){
				return { ...state, ...action.payload.engine };
			}
			return state;
		case 'INIT_BG_STATE':
			return { backgroundState : Engine.state };
		case 'UPDATE_BG_STATE':
			// eslint-disable-next-line no-case-declarations
			const newState = {...state};
			newState.backgroundState[action.key] = Engine.state[action.key];
			return newState;
		default:
			return state;
	}
};

export default engineReducer;
