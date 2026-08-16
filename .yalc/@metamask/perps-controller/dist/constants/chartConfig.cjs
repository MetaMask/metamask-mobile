"use strict";
/**
 * Portable chart configuration constants for PerpsController
 * NO UI dependencies (@metamask/design-tokens, Colors, Theme)
 *
 * UI-specific exports (PERPS_CHART_CONFIG, CHART_INTERVALS, TIME_DURATIONS,
 * getCandlestickColors) remain in the outer constants/chartConfig.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateCandleCount = exports.getDefaultCandlePeriodForDuration = exports.getCandlePeriodsForDuration = exports.DEFAULT_CANDLE_PERIOD = exports.CANDLE_PERIODS = exports.DURATION_CANDLE_PERIODS = exports.MAX_CANDLE_COUNT = exports.ChartInterval = exports.TimeDuration = exports.CandlePeriod = void 0;
/**
 * Enum for available candle periods
 * Provides type safety and prevents typos when referencing candle periods
 */
var CandlePeriod;
(function (CandlePeriod) {
    CandlePeriod["OneMinute"] = "1m";
    CandlePeriod["ThreeMinutes"] = "3m";
    CandlePeriod["FiveMinutes"] = "5m";
    CandlePeriod["FifteenMinutes"] = "15m";
    CandlePeriod["ThirtyMinutes"] = "30m";
    CandlePeriod["OneHour"] = "1h";
    CandlePeriod["TwoHours"] = "2h";
    CandlePeriod["FourHours"] = "4h";
    CandlePeriod["EightHours"] = "8h";
    CandlePeriod["TwelveHours"] = "12h";
    CandlePeriod["OneDay"] = "1d";
    CandlePeriod["ThreeDays"] = "3d";
    CandlePeriod["OneWeek"] = "1w";
    CandlePeriod["OneMonth"] = "1M";
})(CandlePeriod || (exports.CandlePeriod = CandlePeriod = {}));
/**
 * Enum for available time durations
 * Provides type safety and prevents typos when referencing durations
 */
var TimeDuration;
(function (TimeDuration) {
    TimeDuration["OneHour"] = "1hr";
    TimeDuration["OneDay"] = "1d";
    TimeDuration["OneWeek"] = "1w";
    TimeDuration["OneMonth"] = "1m";
    TimeDuration["YearToDate"] = "ytd";
    TimeDuration["Max"] = "max";
})(TimeDuration || (exports.TimeDuration = TimeDuration = {}));
/**
 * Enum for chart intervals (legacy support)
 * Note: Some intervals overlap with CandlePeriod but serve different purposes
 */
var ChartInterval;
(function (ChartInterval) {
    ChartInterval["OneMinute"] = "1m";
    ChartInterval["FiveMinutes"] = "5m";
    ChartInterval["FifteenMinutes"] = "15m";
    ChartInterval["ThirtyMinutes"] = "30m";
    ChartInterval["OneHour"] = "1h";
    ChartInterval["TwoHours"] = "2h";
    ChartInterval["FourHours"] = "4h";
    ChartInterval["EightHours"] = "8h";
})(ChartInterval || (exports.ChartInterval = ChartInterval = {}));
/**
 * Maximum number of candles to load in memory
 * Extracted from PERPS_CHART_CONFIG.CANDLE_COUNT.TOTAL for portability
 */
exports.MAX_CANDLE_COUNT = 500;
/**
 * Available candle periods mapped to each time duration
 * This ensures users only see sensible candle periods for each duration
 * and keeps the chart readable on mobile screens (target: ~20-100 candles)
 */
exports.DURATION_CANDLE_PERIODS = {
    [TimeDuration.OneHour]: {
        periods: [
            { label: '1min', value: CandlePeriod.OneMinute }, // 60 candles
            { label: '3min', value: CandlePeriod.ThreeMinutes }, // 20 candles
            { label: '5min', value: CandlePeriod.FiveMinutes }, // 12 candles
            { label: '15min', value: CandlePeriod.FifteenMinutes }, // 4 candles
        ],
        default: CandlePeriod.OneMinute, // 1-minute candles for development/testing
    },
    [TimeDuration.OneDay]: {
        periods: [
            { label: '15min', value: CandlePeriod.FifteenMinutes }, // 96 candles
            { label: '1h', value: CandlePeriod.OneHour }, // 24 candles
            { label: '2h', value: CandlePeriod.TwoHours }, // 12 candles
            { label: '4h', value: CandlePeriod.FourHours }, // 6 candles
        ],
        default: CandlePeriod.OneHour, // Good balance for daily view
    },
    [TimeDuration.OneWeek]: {
        periods: [
            { label: '1h', value: CandlePeriod.OneHour }, // 168 candles (bit high, but acceptable)
            { label: '2h', value: CandlePeriod.TwoHours }, // 84 candles
            { label: '4h', value: CandlePeriod.FourHours }, // 42 candles
            { label: '8h', value: CandlePeriod.EightHours }, // 21 candles
            { label: '1D', value: CandlePeriod.OneDay }, // 7 candles
        ],
        default: CandlePeriod.FourHours, // Good detail for weekly view
    },
    [TimeDuration.OneMonth]: {
        periods: [
            { label: '8h', value: CandlePeriod.EightHours }, // 90 candles (30 days * 3 per day)
            { label: '12h', value: CandlePeriod.TwelveHours }, // 60 candles (30 days * 2 per day)
            { label: '1D', value: CandlePeriod.OneDay }, // 30 candles
            { label: '1W', value: CandlePeriod.OneWeek }, // ~4 candles
        ],
        default: CandlePeriod.OneDay, // Daily candles for monthly view
    },
    [TimeDuration.YearToDate]: {
        periods: [
            { label: '1D', value: CandlePeriod.OneDay }, // ~365 candles (will be capped)
            { label: '1W', value: CandlePeriod.OneWeek }, // ~52 candles
        ],
        default: CandlePeriod.OneWeek, // Weekly candles for yearly view
    },
    [TimeDuration.Max]: {
        periods: [
            { label: '1W', value: CandlePeriod.OneWeek }, // ~104 candles (2 years)
        ],
        default: CandlePeriod.OneWeek, // Only weekly makes sense for max view
    },
};
exports.CANDLE_PERIODS = [
    { label: '1m', value: CandlePeriod.OneMinute },
    { label: '3m', value: CandlePeriod.ThreeMinutes },
    { label: '5m', value: CandlePeriod.FiveMinutes },
    { label: '15m', value: CandlePeriod.FifteenMinutes },
    { label: '30m', value: CandlePeriod.ThirtyMinutes },
    { label: '1h', value: CandlePeriod.OneHour },
    { label: '2h', value: CandlePeriod.TwoHours },
    { label: '4h', value: CandlePeriod.FourHours },
    { label: '8h', value: CandlePeriod.EightHours },
    { label: '12h', value: CandlePeriod.TwelveHours },
    { label: '1d', value: CandlePeriod.OneDay },
    { label: '3d', value: CandlePeriod.ThreeDays },
    { label: '7d', value: CandlePeriod.OneWeek },
];
exports.DEFAULT_CANDLE_PERIOD = CandlePeriod.FifteenMinutes;
/**
 * Get available candle periods for a specific duration
 *
 * @param duration - The time duration to retrieve candle periods for.
 * @returns The list of candle period options available for the given duration.
 */
const getCandlePeriodsForDuration = (duration) => {
    const periods = exports.DURATION_CANDLE_PERIODS[duration]?.periods || [];
    return periods;
};
exports.getCandlePeriodsForDuration = getCandlePeriodsForDuration;
/**
 * Get the default candle period for a specific duration
 *
 * @param duration - The time duration to retrieve the default candle period for.
 * @returns The default candle period for the given duration.
 */
const getDefaultCandlePeriodForDuration = (duration) => exports.DURATION_CANDLE_PERIODS[duration]?.default ||
    CandlePeriod.OneHour;
exports.getDefaultCandlePeriodForDuration = getDefaultCandlePeriodForDuration;
/**
 * Calculate the number of candles to fetch based on duration and candle period
 *
 * @param duration - The time duration for the chart display.
 * @param candlePeriod - The candle period interval.
 * @returns The number of candles to fetch, capped at MAX_CANDLE_COUNT.
 */
const calculateCandleCount = (duration, candlePeriod) => {
    // Convert candle period to minutes
    const periodInMinutes = (() => {
        switch (candlePeriod) {
            case CandlePeriod.OneMinute:
                return 1;
            case CandlePeriod.ThreeMinutes:
                return 3;
            case CandlePeriod.FiveMinutes:
                return 5;
            case CandlePeriod.FifteenMinutes:
                return 15;
            case CandlePeriod.ThirtyMinutes:
                return 30;
            case CandlePeriod.OneHour:
                return 60;
            case CandlePeriod.TwoHours:
                return 120;
            case CandlePeriod.FourHours:
                return 240;
            case CandlePeriod.EightHours:
                return 480;
            case CandlePeriod.TwelveHours:
                return 720;
            case CandlePeriod.OneDay:
                return 1440; // 24 * 60
            case CandlePeriod.ThreeDays:
                return 4320; // 3 * 24 * 60
            case CandlePeriod.OneWeek:
                return 10080; // 7 * 24 * 60
            case CandlePeriod.OneMonth:
                return 43200; // 30 * 24 * 60 (approximate)
            default:
                return 60; // Default to 1h
        }
    })();
    // Convert duration to total minutes needed
    const durationInMinutes = (() => {
        switch (duration) {
            case TimeDuration.OneHour:
                return 60; // 1 hour
            case TimeDuration.OneDay:
                return 60 * 24; // 1 day
            case TimeDuration.OneWeek:
                return 60 * 24 * 7; // 1 week
            case TimeDuration.OneMonth:
                return 60 * 24 * 30; // 1 month (30 days)
            case TimeDuration.YearToDate:
                return 60 * 24 * 365; // Year to date (365 days max)
            case TimeDuration.Max:
                return 60 * 24 * 365 * 2; // Max (2 years)
            default:
                return 60 * 24; // Default to 1 day
        }
    })();
    // Calculate number of candles needed
    const candleCount = Math.ceil(durationInMinutes / periodInMinutes);
    // Cap at MAX_CANDLE_COUNT candles max for memory management
    // Allow minimum of 10 candles for basic functionality
    return Math.min(Math.max(candleCount, 10), exports.MAX_CANDLE_COUNT);
};
exports.calculateCandleCount = calculateCandleCount;
//# sourceMappingURL=chartConfig.cjs.map