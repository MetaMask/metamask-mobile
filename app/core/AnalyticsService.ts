import { METRICS_OPT_IN } from '../constants/storage';
import Analytics from './Analytics';
import DefaultPreference from 'react-native-default-preference';

class AnalyticsService {
	/**
	 * Initializer for the AnalyticsService
	 *
	 * @param store - Redux store
	 */
	initalizeAnalytics = async () => {
		const metricsOptIn = await DefaultPreference.get(METRICS_OPT_IN);
		Analytics.init(metricsOptIn);
	};
}

/**
 * AnalyticsService class for initializing and subscribing to analytics
 */
export default new AnalyticsService();
