/**
 * Params type allow to pass key value params to the tracking function.
 */
export interface Params {
    [key: string]: any;
}

/**
 * Category is a special type of Params that is used to indicate
 * that the event should be tracked as an error.
 * Used in the trackErrorAsAnalytics function.
 */
export interface Category {
    category: string
}

/**
 * This is the interface for the MetaMetricsProvider.
 *
 * This interface allows multiple implementations of the MetaMetricsProvider
 * including, for now, the legacy implementation and the Segment implementation.
 */
export interface MetaMetricsProvider {
    /**
     * Tracks an event with the given name.
     * @param eventName - The name of the event to track.
     * @param anonymously - optional parameter to indicate whether the event should be tracked anonymously. Defaults to true.
     */
    trackEvent(eventName: string, anonymously?: boolean): void;
    /**
     * Tracks an event with the given name and parameters.
     * @param eventName - The name of the event to track.
     * @param params - The parameters of the event to track.
     * @param anonymously - optional parameter to indicate whether the event should be tracked anonymously.
     */
    trackEventWithParameters(eventName: string | Category, params: Params, anonymously?: boolean): void;
}
