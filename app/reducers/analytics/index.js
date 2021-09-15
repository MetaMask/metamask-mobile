import { REHYDRATE } from 'redux-persist';
import Analytics from '../../core/Analytics';
import { store } from '../../store';

const initialState = {
	enabled: false,
};

function initalizeAnalytics(enabled = true) {
	Analytics.init(enabled);

	Analytics.subscribe(() => {
		store.dispatch({ type: 'UPDATE_ANALYTICS_STATE' });
	});
}

const analyticsReducer = (state = initialState, action) => {
	switch (action.type) {
		case REHYDRATE:
			initalizeAnalytics(action.payload?.analytics?.enabled);
			if (action.payload?.analytics) {
				return { ...state, ...action.payload.analytics };
			}
			return state;
		case 'UPDATE_ANALYTICS_STATE':
			return { enabled: Analytics.getEnabled() };
		default:
			return state;
	}
};

export default analyticsReducer;
