import { REHYDRATE } from 'redux-persist';

const initialState = {
	approvedHosts: {},
	privacyMode: true
};

const privacyReducer = (state = initialState, action) => {
	const newHosts = { ...state.approvedHosts };
	switch (action.type) {
		case REHYDRATE:
			if (action.payload && action.payload.privacy) {
				return { ...state, ...action.payload.privacy };
			}
			return state;
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

export default privacyReducer;
