# MetaMask Mobile verification map

User-facing Predict UI and shared mobile quality gates. Read this index, then the feature file matching the screen or command you need to prove.

## Baseline preconditions

- Repo: `/agent/repos/metamask-mobile`
- Node ^24 and Yarn 4 on PATH
- `yarn install --immutable` completed
- `.js.env` present (copy from `.js.env.example` if needed)
- Helper: `scripts/verification/verify-metamask-mobile/helpers/metamask-mobile-verify.sh`
- Assign `RUN_ID`; artifacts under `/tmp/metamask-mobile-verify-$RUN_ID/`

## Driving conventions

- Prefer component view tests for screen behavior; unit tests for hooks/selectors
- Scope lint to changed paths when possible; full `lint:tsc` for type safety
- Appium smoke is not the default on Linux Cloud Agents
- Match existing Jest config files (`jest.config.view.js`, `jest.config.integration.js`)
- Sync agent coding skills when needed: `yarn skills`

## Proof and skip reporting

- Save Jest log output and proof.txt with exit code
- UI proof without simulator = view test artifacts, not screenshots
- Report Appium/E2E as skipped when no emulator — do not substitute unit tests silently

## Features

- [Static analysis gate](./static-analysis.md) — ESLint + TypeScript on changed trees
- [Predict home screen views](./predict-home.md) — Predict home view tests
- [Predict feed browsing](./predict-feed.md) — feed list and feed view tests
- [Predict positions](./predict-positions.md) — positions screen view tests
- [Predict market details](./predict-market-details.md) — market detail view tests
