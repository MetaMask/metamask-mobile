# Predict positions

Users review open prediction positions and unrealized PnL from the positions screen.

## Sub-features

- `positions-list` — renders position rows
- `positions-empty` — empty state when user has no positions

## How to get to it (user POV)

- Navigate to Predict → Positions tab/screen

## Driving it with metamask-mobile-verify.sh

Preconditions:

- `doctor` passes

- **View test.** `yarn jest -c jest.config.view.js app/components/UI/Predict/views/PredictPositionsView/PredictPositionsView.view.test.tsx --runInBand --silent --coverage=false`
- **Proof.** Exit 0; capture log under artifacts dir

## Gotchas

- Live positions require backend + wallet state — view tests use fixtures
- PnL formatting tests may live in hook unit tests (`useUnrealizedPnL`)
