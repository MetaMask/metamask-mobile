/**
 * TEMP A/B for TSA-1807 Live memory: skip remote trader/token bitmaps and GIF
 * decode so scroll PSS can be compared without image churn. Prior flags stay on
 * (`FORCE_STATIC_LIVE_CARD_HEADERS`, `DISABLE_SOCIAL_FEED_REALTIME_LISTENER`,
 * `livePriceStreamAb.disable`). Mutable so unit tests can flip it. Set
 * `disable` to `false` after the main-dev measure.
 */
export const socialFeedImageAb = { disable: true };
