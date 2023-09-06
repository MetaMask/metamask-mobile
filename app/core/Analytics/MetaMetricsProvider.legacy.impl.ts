import {MetaMetricsProvider, Category, Params} from "./MetaMetricsProvider.type";
import {createClient, SegmentClient} from "@segment/analytics-react-native";
import * as console from "console";
import Analytics from "./Analytics";

/**
 * This is the implementation of the MetaMetricsProvider interface for legacy Analytics.
 */
export default class MetaMetricsProviderLegacyImpl implements MetaMetricsProvider {
    static instance: MetaMetricsProvider;

    /**
     * Returns the singleton instance of the MetaMetricsProvider.
     *
     * Prevents multiple instances of the MetaMetricsProvider from being created.
     * and saves memory and processing.
     *
     * @returns {MetaMetricsProvider} The singleton instance of the MetaMetricsProvider.
     */
    static getInstance = (): MetaMetricsProvider => {
        if(this.instance) {
            return this.instance;
        }
        return new MetaMetricsProviderLegacyImpl();
    };

    /**
     * Tracks an event with the given name.
     * @param eventName - The name of the event to track.
     * @param anonymously - optional parameter to indicate whether the event should be tracked anonymously.
     */
    trackEvent = (eventName: string, anonymously?: boolean): void => {
        Analytics.trackEvent(eventName, anonymously);
    };

    /**
     * Tracks an event with the given name and parameters.
     * @param eventName - The name of the event to track.
     * @param params - The parameters of the event to track.
     * @param anonymously - optional parameter to indicate whether the event should be tracked anonymously.
     */
    trackEventWithParameters(eventName: string | Category, params?: Params, anonymously?: boolean): void {
        Analytics.trackEventWithParameters(eventName, params, anonymously);
    }
}
