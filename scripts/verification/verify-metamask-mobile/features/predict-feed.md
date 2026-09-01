# Predict feed browsing

Users scroll curated feeds (e.g. sports) and open individual markets from feed rows.

## Sub-features

- `predict-feed-list` — feed container renders market rows
- `predict-feed-view` — dedicated feed screen navigation

## How to get to it (user POV)

- Tap a feed card on Predict home
- Land on feed detail with market list

## Driving it with metamask-mobile-verify.sh

Preconditions:

- `doctor` passes

- **Feed container.** `yarn jest -c jest.config.view.js app/components/UI/Predict/views/PredictFeed/PredictFeed.view.test.tsx --runInBand --silent --coverage=false`
- **Feed view screen.** `yarn jest -c jest.config.view.js app/components/UI/Predict/views/PredictFeedView/PredictFeedView.view.test.tsx --runInBand --silent --coverage=false`
- **Batch.** `drive-predict-views` helper runs entire `views/` tree
- **Proof.** Jest logs with exit 0

## Gotchas

- API responses are mocked in view tests
- Feed ids must match test fixtures, not production Kalshi ids
