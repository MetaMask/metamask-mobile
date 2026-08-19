# PredictCryptoUpDownDetails

Full-screen detail view for Crypto Up/Down prediction markets (e.g., "BTC Up or Down - 5 Minutes").

## When it renders

`PredictMarketDetails` renders this screen instead of the default market view when **both** conditions are met:

1. The `predict_up_down_enabled` feature flag is `true`.
2. `isCryptoUpDown(market)` returns `true` — meaning the market has a `series`, an `up-or-down` tag, and a `crypto` tag.

## Props

| Prop         | Type                                        | Description                                  |
| ------------ | ------------------------------------------- | -------------------------------------------- |
| `market`     | `PredictMarket & { series: PredictSeries }` | The market to display. Must have a `series`. |
| `onBack`     | `() => void`                                | Called when the back button is pressed.      |
| `onRefresh`  | `() => void`                                | Called when the user pulls to refresh.       |
| `refreshing` | `boolean`                                   | Whether a refresh is currently in progress.  |

## Structure

```
SafeAreaView
└── HeaderStandardAnimated   (animated compact header with share button)
└── Animated.ScrollView
    └── Box (title section — drives header animation threshold)
        └── TitleSubpage     (market image + series title + end date)
```
