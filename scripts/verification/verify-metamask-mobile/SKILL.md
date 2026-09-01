---
name: verify-metamask-mobile
description: Prove MetaMask Mobile UI and Predict changes via Jest view/unit tests, ESLint, and TypeScript — the user-facing behavior agents can drive on Linux CI and Cloud Agents without a simulator. Use after mobile or Predict UI changes; pair with walkthrough-artifacts when a simulator is available.
---

# Verify MetaMask Mobile

React Native wallet (Expo + native). **Primary agent-verifiable surface on Linux:** Jest test layers and static analysis. Full Appium smoke requires iOS/Android simulators and is CI-only unless explicitly available.

Repo root: `/agent/repos/metamask-mobile`

| Layer | Harness | When |
|-------|---------|------|
| ESLint + TypeScript | `yarn lint`, `yarn lint:tsc` | Every change |
| Unit tests (`*.test.tsx`) | `yarn jest <path>` | Logic/hooks |
| Component view tests (`*.view.test.tsx`) | `yarn jest -c jest.config.view.js <path>` | Screens/components |
| Integration tests (`*.integration.test.tsx`) | `yarn jest -c jest.config.integration.js <path>` | Controller wiring |
| Appium smoke | `yarn appium-smoke:ios\|android` | CI / local sim only |
| Visual walkthrough | `walkthrough-artifacts` skill | Simulator available |

## Launch

No long-lived server is required for the default verification path.

One-time / stale checkout:

```bash
cd /agent/repos/metamask-mobile
export PATH="/home/ubuntu/.nvm/versions/node/v24.18.0/bin:$PATH"
yarn install --immutable
# JS-only work:
yarn setup:expo
cp .js.env.example .js.env   # if missing; set MM_INFURA_PROJECT_ID when needed
```

Optional Metro (manual UI only):

```bash
yarn watch:clean   # tmux session recommended
```

Ready for test harness when `doctor` passes.

## Doctor

```bash
bash scripts/verification/verify-metamask-mobile/helpers/metamask-mobile-verify.sh doctor
```

Pass criteria: Node/Yarn available, `node_modules` present, `.js.env` or `.js.env.example` exists.

## Drive

Read `scripts/verification/verify-metamask-mobile/features/README.md` first.

**Scoped static check (Predict default):**

```bash
export RUN_ID="mm-verify-$(date +%s)"
bash scripts/verification/verify-metamask-mobile/helpers/metamask-mobile-verify.sh drive-static app/components/UI/Predict/
```

**Predict view tests (user-visible screens):**

```bash
bash scripts/verification/verify-metamask-mobile/helpers/metamask-mobile-verify.sh drive-predict-views
```

**Changed-file targeted unit test:**

```bash
yarn jest app/components/UI/Predict/hooks/useLiveMarketPrices.test.ts --runInBand
```

**Full unit gate (CI subset):**

```bash
yarn test:unit
```

**Appium (skip unless simulator + main-e2e build confirmed):**

```bash
yarn build:ios:main:e2e   # or android
yarn appium-smoke:ios
```

## Evidence

Artifacts root: `/tmp/metamask-mobile-verify-$RUN_ID/` (override `MM_VERIFY_ARTIFACTS`).

Each drive writes logs plus `*-proof.txt` with command, exit code, and feature id.

Proof standards:

- View tests assert rendered user-visible output — prefer them for UI changes
- Capture Jest stdout/log file, not just pass/fail boolean
- Do not claim Appium coverage when only Jest ran — report skipped with reason
- With simulator: use `walkthrough-artifacts` for screenshots/video of the changed screen

## Cleanup

```bash
bash scripts/verification/verify-metamask-mobile/helpers/metamask-mobile-verify.sh cleanup
```

Test harness leaves no processes. Stop Metro manually if you started it for walkthrough.

Artifacts survive cleanup.

## Helpers

| Command | Purpose |
|---------|---------|
| `... doctor` | Tooling + deps check |
| `... drive-static [path]` | ESLint + tsc (default Predict tree) |
| `... drive-predict-views` | All Predict `*.view.test.tsx` under `views/` |
| `... cleanup` | No-op except artifact preservation notice |

Predict-specific commands also documented in `docs/predict/implementation-guide.md` (Verification Commands section).

Maintained under `scripts/verification/verify-metamask-mobile/features/`. For Cursor auto-discovery, symlink or copy this folder to `.cursor/skills/verify-metamask-mobile/` (gitignored in this repo).

Run `/maintain-verification-skill` when navigation, test ids, or Predict routes change.
