export interface Params {
    [key: string]: any;
}

export interface Category {
    category: string
}

/** Enum for the different providers that can be used for tracking events */
export interface MetaMetricsProvider {
    trackEvent(eventName: string, anonymously?: boolean): void;
    trackEventWithParameters(eventName: string | Category, params: Params, anonymously?: boolean): void;
}
