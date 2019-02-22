import { REHYDRATE } from 'redux-persist';

const initialState = {
	history: [],
	whitelist: []
};
const browserReducer = (state = initialState, action) => {
	switch (action.type) {
		case REHYDRATE:
			if (action.payload && action.payload.browser) {
				return { ...state, ...action.payload.browser };
			}
			return state;
		case 'ADD_TO_BROWSER_HISTORY':
			return {
				...state,
				history: [...state.history, { url: action.url, name: action.name }]
			};
		case 'ADD_TO_BROWSER_WHITELIST':
			return {
				...state,
				whitelist: [...state.whitelist, action.url]
			};
		case 'CLEAR_BROWSER_HISTORY':
			return {
				...state,
				history: []
			};
		default:
			return state;
	}
};
export default browserReducer;
