import Analytics from '../../core/Analytics';

const initialState = {
	enabled: false,
};

const analyticsReducer = (state = initialState, action) => {
	switch (action.type) {
		case 'UPDATE_ANALYTICS_STATE':
			return { enabled: Analytics.getEnabled() };
		default:
			return state;
	}
};

export default analyticsReducer;
