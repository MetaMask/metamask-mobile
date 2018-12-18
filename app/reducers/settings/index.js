import { REHYDRATE } from 'redux-persist';
import AppConstants from '../../core/AppConstants';

const initialState = {
	search_engine: AppConstants.DEFAULT_SEARCH_ENGINE,
	lock_time: AppConstants.DEFAULT_LOCK_TIMEOUT
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
				search_engine: action.search_engine
			};
		case 'SET_LOCK_TIME':
			return {
				...state,
				lock_time: action.lock_time
			};
		default:
			return state;
	}
};
export default settingsReducer;
