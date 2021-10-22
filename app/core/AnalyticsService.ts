import Analytics from './Analytics';

class AnalyticsService {
	/**
	 * Initializer for the AnalyticsService
	 *
	 * @param store - Redux store
	 */
	initalizeAnalytics = (store: any) => {
		const reduxState = store.getState?.();
		const analyticsEnabled = reduxState?.analytics?.enabled || true;

		Analytics.init(analyticsEnabled);

		Analytics.subscribe(() => {
			store.dispatch({ type: 'UPDATE_ANALYTICS_STATE' });
		});
	};
}

/**
 * AnalyticsService class for initializing and subscribing to analytics
 */
export default new AnalyticsService();
