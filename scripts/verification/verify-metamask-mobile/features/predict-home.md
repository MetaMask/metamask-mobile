# Predict home screen views

Predict home is the entry surface for browsing prediction markets inside MetaMask.

## Sub-features

- `predict-home-render` — home layout renders expected headings and navigation affordances
- `predict-home-states` — loading/empty/error states (per view test cases)

## How to get to it (user POV)

- User opens Predict tab from wallet bottom navigation
- Deeplink / feature flag may gate visibility

## Driving it with metamask-mobile-verify.sh

Preconditions:

- `doctor` passes

- **View tests.** `yarn jest -c jest.config.view.js app/components/UI/Predict/views/PredictHome/PredictHome.view.test.tsx --runInBand --silent --coverage=false`
- **Or batch.** `bash scripts/verification/verify-metamask-mobile/helpers/metamask-mobile-verify.sh drive-predict-views` (includes this file)
- **Proof.** Jest exit 0; log saved under `$MM_VERIFY_ARTIFACTS/predict-views.log`

## Gotchas

- View tests mock network/controllers — they prove UI wiring, not live Kalshi data
- Feature flags may affect rendered branches; tests encode expected flag state
