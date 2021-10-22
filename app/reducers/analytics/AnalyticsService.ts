import Analytics from '../../core/Analytics';
import { store } from '../../store';

class AnalyticsService {
	initalizeAnalytics = (enabled = true) => {
		Analytics.init(enabled);

		Analytics.subscribe(() => {
			store.dispatch({ type: 'UPDATE_ANALYTICS_STATE' });
		});
	};
}

/**
 * AnalyticsService class for initializing and subscribing to analytics
 */
export default new AnalyticsService();
