import {MetaMetricsProvider, Category, Params} from "./MetaMetricsProvider.type";
import {createClient, SegmentClient} from "@segment/analytics-react-native";
import * as console from "console";
import Analytics from "./Analytics";

export default class MetaMetricsProviderLegacyImpl implements MetaMetricsProvider {
    static instance: MetaMetricsProvider;

    static getInstance = (): MetaMetricsProvider => {
        if(this.instance) {
            return this.instance;
        }
        return new MetaMetricsProviderLegacyImpl();
    };

    trackEvent = (eventName: string, anonymously?: boolean): void => {
        Analytics.trackEvent(eventName, anonymously);
    };

    trackEventWithParameters(eventName: string | Category, params?: Params, anonymously?: boolean): void {
        Analytics.trackEventWithParameters(eventName, params, anonymously);
    }
}
