import { REHYDRATE } from 'redux-persist';
import AppConstants from '../../core/AppConstants';

const initialState = {
	searchEngine: AppConstants.DEFAULT_SEARCH_ENGINE,
	lockTime: -1 // Disabled by default
};

const settingsReducer = (state = initialState, action) => {
	switch (action.type) {
		case REHYDRATE:
			if (action.payload && action.payload.settings) {
				return { ...state, ...action.payload.settings };
			}
			return state;
		case 'SET_SEARCH_ENGINE':
			return {
				...state,
				searchEngine: action.searchEngine
			};
		case 'SET_LOCK_TIME':
			return {
				...state,
				lockTime: action.lockTime
			};
		case 'SET_SHOW_HEX_DATA':
			return {
				...state,
				showHexData: action.showHexData
			};
		default:
			return state;
	}
};
export default settingsReducer;
