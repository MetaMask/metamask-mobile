import { REHYDRATE } from 'redux-persist';

const initialState = {
	events: []
};

/**
 * Reducer to keep track of user oboarding actions to send it to analytics if the user
 * decides to optin after finishing onboarding flow
 */
const onboardingReducer = (state = initialState, action) => {
	switch (action.type) {
		case REHYDRATE:
			if (action.payload && action.payload.onboarding) {
				return { ...state, ...action.payload.onboarding };
			}
			return state;
		case 'SAVE_EVENT':
			state.events.push(action.event);
			return state;
		case 'CLEAR_EVENTS':
			return {
				...state,
				events: []
			};
		default:
			return state;
	}
};

export default onboardingReducer;
