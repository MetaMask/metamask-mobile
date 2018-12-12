import { REHYDRATE } from 'redux-persist';
import Engine from '../core/Engine';
import { store } from '../store';

const initialState = {
	backgroundState: {},
	approvedHosts: {},
	privacyMode: true
};

function initalizeEngine(state = {}) {
	Engine.init(state);
	Engine.datamodel &&
		Engine.datamodel.subscribe(() => {
			store.dispatch({ type: 'UPDATE_BG_STATE' });
		});
}

const rootReducer = (state = initialState, action) => {
	const newHosts = { ...state.approvedHosts };
	switch (action.type) {
		case REHYDRATE:
			initalizeEngine(action.payload && action.payload.backgroundState);
			return { ...state, ...action.payload };
		case 'UPDATE_BG_STATE':
			return { ...state, backgroundState: Engine.state };
		case 'APPROVE_HOST':
			return {
				...state,
				approvedHosts: {
					...state.approvedHosts,
					[action.hostname]: true
				}
			};
		case 'REJECT_HOST':
			delete newHosts[action.hostname];
			return {
				...state,
				approvedHosts: newHosts
			};
		case 'CLEAR_HOSTS':
			return {
				...state,
				approvedHosts: {}
			};
		case 'SET_PRIVACY_MODE':
			return {
				...state,
				privacyMode: action.enabled
			};
		default:
			return state;
	}
};
export default rootReducer;
