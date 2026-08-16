/**
 * Portable chart configuration constants for PerpsController
 * NO UI dependencies (@metamask/design-tokens, Colors, Theme)
 *
 * UI-specific exports (PERPS_CHART_CONFIG, CHART_INTERVALS, TIME_DURATIONS,
 * getCandlestickColors) remain in the outer constants/chartConfig.ts
 */
/**
 * Enum for available candle periods
 * Provides type safety and prevents typos when referencing candle periods
 */
export declare enum CandlePeriod {
    OneMinute = "1m",
    ThreeMinutes = "3m",
    FiveMinutes = "5m",
    FifteenMinutes = "15m",
    ThirtyMinutes = "30m",
    OneHour = "1h",
    TwoHours = "2h",
    FourHours = "4h",
    EightHours = "8h",
    TwelveHours = "12h",
    OneDay = "1d",
    ThreeDays = "3d",
    OneWeek = "1w",
    OneMonth = "1M"
}
/**
 * Enum for available time durations
 * Provides type safety and prevents typos when referencing durations
 */
export declare enum TimeDuration {
    OneHour = "1hr",
    OneDay = "1d",
    OneWeek = "1w",
    OneMonth = "1m",
    YearToDate = "ytd",
    Max = "max"
}
/**
 * Enum for chart intervals (legacy support)
 * Note: Some intervals overlap with CandlePeriod but serve different purposes
 */
export declare enum ChartInterval {
    OneMinute = "1m",
    FiveMinutes = "5m",
    FifteenMinutes = "15m",
    ThirtyMinutes = "30m",
    OneHour = "1h",
    TwoHours = "2h",
    FourHours = "4h",
    EightHours = "8h"
}
/**
 * Maximum number of candles to load in memory
 * Extracted from PERPS_CHART_CONFIG.CANDLE_COUNT.TOTAL for portability
 */
export declare const MAX_CANDLE_COUNT = 500;
/**
 * Available candle periods mapped to each time duration
 * This ensures users only see sensible candle periods for each duration
 * and keeps the chart readable on mobile screens (target: ~20-100 candles)
 */
export declare const DURATION_CANDLE_PERIODS: {
    readonly "1hr": {
        readonly periods: readonly [{
            readonly label: "1min";
            readonly value: CandlePeriod.OneMinute;
        }, {
            readonly label: "3min";
            readonly value: CandlePeriod.ThreeMinutes;
        }, {
            readonly label: "5min";
            readonly value: CandlePeriod.FiveMinutes;
        }, {
            readonly label: "15min";
            readonly value: CandlePeriod.FifteenMinutes;
        }];
        readonly default: CandlePeriod.OneMinute;
    };
    readonly "1d": {
        readonly periods: readonly [{
            readonly label: "15min";
            readonly value: CandlePeriod.FifteenMinutes;
        }, {
            readonly label: "1h";
            readonly value: CandlePeriod.OneHour;
        }, {
            readonly label: "2h";
            readonly value: CandlePeriod.TwoHours;
        }, {
            readonly label: "4h";
            readonly value: CandlePeriod.FourHours;
        }];
        readonly default: CandlePeriod.OneHour;
    };
    readonly "1w": {
        readonly periods: readonly [{
            readonly label: "1h";
            readonly value: CandlePeriod.OneHour;
        }, {
            readonly label: "2h";
            readonly value: CandlePeriod.TwoHours;
        }, {
            readonly label: "4h";
            readonly value: CandlePeriod.FourHours;
        }, {
            readonly label: "8h";
            readonly value: CandlePeriod.EightHours;
        }, {
            readonly label: "1D";
            readonly value: CandlePeriod.OneDay;
        }];
        readonly default: CandlePeriod.FourHours;
    };
    readonly "1m": {
        readonly periods: readonly [{
            readonly label: "8h";
            readonly value: CandlePeriod.EightHours;
        }, {
            readonly label: "12h";
            readonly value: CandlePeriod.TwelveHours;
        }, {
            readonly label: "1D";
            readonly value: CandlePeriod.OneDay;
        }, {
            readonly label: "1W";
            readonly value: CandlePeriod.OneWeek;
        }];
        readonly default: CandlePeriod.OneDay;
    };
    readonly ytd: {
        readonly periods: readonly [{
            readonly label: "1D";
            readonly value: CandlePeriod.OneDay;
        }, {
            readonly label: "1W";
            readonly value: CandlePeriod.OneWeek;
        }];
        readonly default: CandlePeriod.OneWeek;
    };
    readonly max: {
        readonly periods: readonly [{
            readonly label: "1W";
            readonly value: CandlePeriod.OneWeek;
        }];
        readonly default: CandlePeriod.OneWeek;
    };
};
export declare const CANDLE_PERIODS: readonly [{
    readonly label: "1m";
    readonly value: CandlePeriod.OneMinute;
}, {
    readonly label: "3m";
    readonly value: CandlePeriod.ThreeMinutes;
}, {
    readonly label: "5m";
    readonly value: CandlePeriod.FiveMinutes;
}, {
    readonly label: "15m";
    readonly value: CandlePeriod.FifteenMinutes;
}, {
    readonly label: "30m";
    readonly value: CandlePeriod.ThirtyMinutes;
}, {
    readonly label: "1h";
    readonly value: CandlePeriod.OneHour;
}, {
    readonly label: "2h";
    readonly value: CandlePeriod.TwoHours;
}, {
    readonly label: "4h";
    readonly value: CandlePeriod.FourHours;
}, {
    readonly label: "8h";
    readonly value: CandlePeriod.EightHours;
}, {
    readonly label: "12h";
    readonly value: CandlePeriod.TwelveHours;
}, {
    readonly label: "1d";
    readonly value: CandlePeriod.OneDay;
}, {
    readonly label: "3d";
    readonly value: CandlePeriod.ThreeDays;
}, {
    readonly label: "7d";
    readonly value: CandlePeriod.OneWeek;
}];
export declare const DEFAULT_CANDLE_PERIOD = CandlePeriod.FifteenMinutes;
/**
 * Get available candle periods for a specific duration
 *
 * @param duration - The time duration to retrieve candle periods for.
 * @returns The list of candle period options available for the given duration.
 */
export declare const getCandlePeriodsForDuration: (duration: TimeDuration | string) => readonly {
    label: string;
    value: CandlePeriod;
}[];
/**
 * Get the default candle period for a specific duration
 *
 * @param duration - The time duration to retrieve the default candle period for.
 * @returns The default candle period for the given duration.
 */
export declare const getDefaultCandlePeriodForDuration: (duration: TimeDuration | string) => CandlePeriod;
/**
 * Calculate the number of candles to fetch based on duration and candle period
 *
 * @param duration - The time duration for the chart display.
 * @param candlePeriod - The candle period interval.
 * @returns The number of candles to fetch, capped at MAX_CANDLE_COUNT.
 */
export declare const calculateCandleCount: (duration: TimeDuration | string, candlePeriod: CandlePeriod | string) => number;
//# sourceMappingURL=chartConfig.d.cts.map