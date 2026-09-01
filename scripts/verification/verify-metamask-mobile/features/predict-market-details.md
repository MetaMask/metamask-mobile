# Predict market details

Users inspect a single market (prices, chart, trade actions) from the market details screen.

## Sub-features

- `market-details-render` — title, prices, and primary actions visible
- `market-details-chart` — chart region renders per test mocks

## How to get to it (user POV)

- Tap a market row from home or feed → market details screen

## Driving it with metamask-mobile-verify.sh

Preconditions:

- `doctor` passes

- **View test.** `yarn jest -c jest.config.view.js app/components/UI/Predict/views/PredictMarketDetails/PredictMarketDetails.view.test.tsx --runInBand --silent --coverage=false`
- **Proof.** Jest exit 0 with saved log

## Gotchas

- Live price hooks (`useLiveMarketPrices`) have separate unit tests — run both when changing streaming logic
- Chart data tests may be slow; `--runInBand` avoids flake
