import {MetaMetricsProvider, Category, Params} from "./MetaMetricsProvider.type";
import {createClient, SegmentClient} from "@segment/analytics-react-native";

const DEFAULT_ANONYMOUS_PARAM = true;

export default class MetaMetricsProviderSegmentImpl implements MetaMetricsProvider {
    static instance: MetaMetricsProvider;
    #segmentClient: SegmentClient;

    constructor() {
        this.#segmentClient = createClient({
            writeKey: (__DEV__
                ? process.env.SEGMENT_DEV_KEY
                : process.env.SEGMENT_PROD_KEY) as string,
            debug: __DEV__,
            proxy: (__DEV__ ? process.env.SEGMENT_DEV_PROXY_KEY : process.env.SEGMENT_PROD_PROXY_KEY) as string,
        });
    }

    static getInstance = (): MetaMetricsProvider => {
        if(this.instance) {
            return this.instance;
        }
        return new MetaMetricsProviderSegmentImpl();
    };

    trackEvent = (eventName: string, anonymously: boolean = DEFAULT_ANONYMOUS_PARAM): void => {
        console.log(`trackEvent ${eventName} ${anonymously}`)
    };

    trackEventWithParameters(eventName: string, params: Params, anonymously?: boolean): void;
    trackEventWithParameters(category: Category): void;
    trackEventWithParameters(eventName: string | Category, params?: Params, anonymously: boolean = DEFAULT_ANONYMOUS_PARAM): void {
        console.log(`trackEvent ${eventName} ${params} ${anonymously}`)
    }

    // trackEventWithParameters = (eventName: string, params: Params, anonymously: boolean = DEFAULT_ANONYMOUS_PARAM): void => {
    //     console.log(`trackEvent ${eventName} ${params} ${anonymously}`)
    // };
    //
    // // trackEventWithParameters = (options: Options): void => {
    // //     console.log(`trackEvent ${options}`)
    // // };
}
