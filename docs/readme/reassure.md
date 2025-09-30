### Reassure POC

- Purpose: Measure React Native component render performance locally and detect regressions between a baseline and current code.

### What’s included currently (local only)

- Reassure CLI integrated.
- Coverage gating: `REASSURE=true` disables Jest coverage for perf runs.
- Scripts:
  - `yarn test:reassure:baseline` → writes `.reassure/baseline.perf`
  - `yarn test:reassure:branch` → writes `.reassure/current.perf`, compares, and exits non‑zero on significant regressions
- Examples:
  - `app/component-library/components/Cards/Card/Card.perf-test.tsx`
  - `app/components/UI/DeepLinkModal/DeepLinkModal.perf-test.tsx` (wrapped in Redux, Navigation, Safe Area providers)

### Quick start (local)

1. Baseline (current code):

```bash
yarn test:reassure:baseline
```

2. Make a change you want to measure (e.g., increase re-renders in a test)
3. Compare:

```bash
yarn test:reassure:branch
```

4. Inspect results:

- Markdown: `.reassure/output.md`
- JSON: `.reassure/output.json`

If regressions are detected, `test:reassure:branch` exits non‑zero.

### Writing a perf test

- Basic mount-only measurement:

```tsx
import { measureRenders } from 'reassure';
import Component from './Component';

test('mount performance', async () => {
  await measureRenders(<Component />);
});
```

- Writing async tests

```tsx
import { measureRenders } from 'reassure';
import { fireEvent } from '@testing-library/react-native';

test('Test with scenario', async () => {
  const scenario = async (screen) => {
    fireEvent.press(screen.getByText('Go'));
    await screen.findByText('Done');
  };

  await measureRenders(<ComponentUnderTest />, { scenario });
});
```

### Future work (CI + stable baseline)

- Once we establish enough perf tests, integrate CI to compare PR branches with stable branch.
- Establish stable branch baseline (e.g., `stable`):
  - On CI, checkout `origin/stable` → `yarn reassure --baseline` (or `yarn test:reassure:baseline`).
  - Checkout the PR commit → `yarn reassure --branch` (or `yarn test:reassure:branch`).
- Report results in PR:
  - Parse `.reassure/output.md` and post as a PR comment (Danger plugin is supported by Reassure).
  - Fail the job when `.reassure/output.json.significant.length > 0` (we already use this exit‑gate locally in `test:reassure:branch`).
- CI stability:
  - Run `yarn reassure check-stability` periodically to validate agent noise.
  - Optionally increase `runs` for noisy agents.
- Caching (optional):
  - Persist `.reassure/baseline.perf` between pipeline steps when comparing within a single job matrix.

This lets us keep local workflows simple, while paving the way for automated, repeatable perf regression checks on PRs against a stable baseline.
