# Reference — Steps 5–7, Assertion Patterns, What NOT to Do

Reference: [SKILL.md](../SKILL.md) · [Writing Tests](writing-tests.md) · [Navigation & Mocking](navigation-mocking.md)

---

## Step 5: Deterministic Fiat Assertions

Pass `deterministicFiat: true` whenever a test asserts exact currency values. This injects stable exchange rates:

```typescript
const { getByText } = renderBridgeView({
  deterministicFiat: true,
  overrides: { bridge: { sourceAmount: '1' } },
});
expect(getByText('$2,000.00')).toBeOnTheScreen();
```

---

## Step 6: Run the Tests

**Always use `jest.config.view.js`** — the default Jest config does not apply the component view test rules.

```bash
# Run a single file
yarn jest -c jest.config.view.js app/components/UI/Bridge/Views/BridgeView/BridgeView.view.test.tsx --runInBand --silent --coverage=false

# Run a specific test by name
yarn jest -c jest.config.view.js <file> -t "renders the source token" --runInBand --silent --coverage=false

# Watch mode
yarn jest -c jest.config.view.js <file> --watch

# Coverage for a feature folder (use this, not --coverage directly — avoids OOM)
yarn test:view:coverage:folder app/components/UI/MyFeature
```

---

## Step 6.5: Self-Review Checklist (run after all tests pass)

Before declaring the task done, go through this checklist for every test written or modified. If any item fails, fix it and re-run.

| #   | Check                                                                                                                                                                                                                                                        | What to do if it fails                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| 1   | **No render scenarios** — every test has at least one `fireEvent`, `waitFor`/`findBy`, `store.dispatch`, or Engine spy                                                                                                                                       | Rewrite the test to add a user interaction or system reaction          |
| 2   | **No selector mocking** — no `(useSelector as jest.Mock).mockImplementation(...)` anywhere in the file                                                                                                                                                       | Remove; drive behavior through state overrides instead                 |
| 3   | **No fake timers** — no `jest.useFakeTimers()`, `jest.advanceTimersByTime()`, or `jest.useRealTimers()`                                                                                                                                                      | Remove fake timers; use `waitFor` / `findBy` for async flows           |
| 4   | **Data-completeness test exists** — if the view loads data asynchronously (API, Engine polling), there is one test that waits for the load and validates all fields of all items in the full base mock using `within()` per row                              | Add the data-completeness test                                         |
| 5   | **Filter/segmentation tests have paired assertions** — every test that selects a filter or changes a network asserts both what appears (`findByTestId`) AND what disappears (`queryByTestId(...).not.toBeOnTheScreen()`) for each item from the previous set | Add the missing negative assertions                                    |
| 6   | **No raw strings in `getByTestId` / `findByTestId` / `queryByTestId`** — all test IDs reference constants from the component's `ComponentName.testIds.ts`                                                                                                    | Create or update the testIds file; replace raw strings with constants  |
| 7   | **Any `jest.mock` for non-Engine modules is flagged** — if a service module is mocked directly, the `eslint-disable` comment is present and a tracking issue is linked                                                                                       | Add the comment and issue link                                         |
| 8   | **AAA formatting** — blank lines between the Arrange, Act, and Assert blocks in every test                                                                                                                                                                   | Add the blank line separators                                          |
| 9   | **Import order** — `mocks.ts` is first; remaining order follows project ESLint rules                                                                                                                                                                         | Ensure `mocks.ts` is the very first import; reorder the rest as needed |

---

## Step 7: Diagnosing Failures

### Identify the error type first

| Error pattern                                    | Likely cause                                       | Fix                                                               |
| ------------------------------------------------ | -------------------------------------------------- | ----------------------------------------------------------------- |
| `jest.mock is not allowed in *.view.test.*`      | Arbitrary `jest.mock` added to test                | Remove it; drive via state instead                                |
| `Unable to find an element with testID: xxx`     | State not providing needed data, or element hidden | Add the relevant state via overrides or check rendering condition |
| `Cannot read property 'X' of undefined`          | Preset missing a required state slice              | Add `.withMinimalXController()` or override in preset             |
| `Warning: An update was not wrapped in act(...)` | Async state update not awaited                     | Use `await waitFor(...)`                                          |
| `No QueryClient set`                             | Missing provider — not in Engine mock              | Add to mocks.ts or wrap with QueryClientProvider in renderer      |
| Flakey number assertions                         | Non-deterministic exchange rates                   | Add `deterministicFiat: true`                                     |
| Test passes locally, fails in CI                 | Time-sensitive assertions                          | Use `waitFor` not inline assertions after interactions            |

### Inspect what's rendered

```typescript
// Add temporarily inside the test
const { debug } = renderBridgeView();
debug(); // prints full component tree
```

### Check that state data reaches the component

Add a `console.log` in the component temporarily, or use `debug()` to confirm the Redux state is wired correctly before writing assertions.

### Check stale presets

When a controller's state shape changes (e.g. a new required field added to `BridgeController`), the preset becomes stale. Compare the component's actual selector usage against what the preset provides.

---

## Assertion Patterns

```typescript
// Presence / absence
expect(getByText('Label')).toBeOnTheScreen();
expect(queryByText('Label')).not.toBeOnTheScreen();

// Enabled / disabled state
expect(getByTestId('cta-button')).toBeEnabled();
expect(getByTestId('cta-button')).toBeDisabled();

// After interaction
fireEvent.press(getByTestId('some-button'));
await waitFor(() => expect(getByText('Result')).toBeOnTheScreen());

// Navigation assertion
await findByTestId(`route-${Routes.SOME_SCREEN}`);

// findByTestId 3rd-arg timeout (NOT 2nd arg)
await findByTestId('my-element', {}, { timeout: 3000 });

// Within a subtree — scope queries to avoid false positives when the same text or
// testID appears in multiple list items (e.g., every row shows a "price" label).
// Use within(rowElement) to constrain the query to a single row.
import { within } from '@testing-library/react-native';
const card = getByTestId(MyViewSelectorsIDs.TOKEN_CARD_ETH);
expect(within(card).getByText('ETH')).toBeOnTheScreen();
expect(within(card).getByText('$2,000.00')).toBeOnTheScreen();
```

---

## What NOT to Do

```typescript
// ❌ Render scenario — no interaction, no system reaction, just static visibility
it('renders input areas and hides confirm button without tokens or amount', () => {
  const { getByTestId, queryByTestId } = renderBridgeView({ overrides: { ... } });
  expect(getByTestId(SOURCE_AREA)).toBeOnTheScreen();     // render check
  expect(getByTestId(DEST_AREA)).toBeOnTheScreen();       // render check
  expect(queryByTestId(CONFIRM_BUTTON)).toBeNull();       // render check
});
// More assertions does NOT make it a better test if they're all static.
// ✅ Instead: drive the test through a user interaction, Redux action, or Engine spy

// ❌ Arbitrary mock — blocked by ESLint and runtime guard
jest.mock('../../some/hook', () => ({ useMyHook: jest.fn() }));

// ❌ Mocking a selector
(useSelector as jest.Mock).mockImplementation(...);

// ❌ Fake timers
jest.useFakeTimers();

// ❌ Snapshot assertion
expect(wrapper).toMatchSnapshot();

// ❌ Rebuilding the whole state from scratch
renderComponentViewScreen(MyView, { name: 'X' }, {
  state: { engine: { backgroundState: { /* 200 lines */ } } },
});
// ✅ Instead: use a preset + minimal overrides

// ❌ Raw string literal in getByTestId / findByTestId / queryByTestId
getByTestId('my-view-scroll-view');
queryByTestId('confirm-button');

// ✅ Use the constant from the component's testIds file
import { MyViewSelectorsIDs } from './MyView.testIds';
getByTestId(MyViewSelectorsIDs.SCROLL_VIEW);
queryByTestId(MyViewSelectorsIDs.CONFIRM_BUTTON);

// If the testIds file does not exist yet, create it first:
// export const MyViewSelectorsIDs = {
//   SCROLL_VIEW: 'my-view-scroll-view',
//   CONFIRM_BUTTON: 'my-view-confirm-button',
// } as const;
```

---

## Quick Reference

```bash
# Run component view tests
yarn jest -c jest.config.view.js <path> --runInBand --silent --coverage=false

# Coverage for a feature folder
yarn test:view:coverage:folder app/components/UI/MyFeature

# Lint check
yarn eslint <path/to/test.tsx>
```

**Key locations:**

| What                                              | Where                                                 |
| ------------------------------------------------- | ----------------------------------------------------- |
| Global Engine + native mocks                      | `tests/component-view/mocks.ts`                       |
| renderComponentViewScreen, renderScreenWithRoutes | `tests/component-view/render.tsx`                     |
| Bridge renderer                                   | `tests/component-view/renderers/bridge.ts`            |
| Wallet renderer                                   | `tests/component-view/renderers/wallet.ts`            |
| Bridge preset                                     | `tests/component-view/presets/bridge.ts`              |
| Wallet preset                                     | `tests/component-view/presets/wallet.ts`              |
| Predict renderer                                  | `tests/component-view/renderers/predict.tsx`          |
| Predict preset                                    | `tests/component-view/presets/predict.ts`             |
| StateFixtureBuilder                               | `tests/component-view/stateFixture.ts`                |
| DeepPartial type                                  | `app/util/test/renderWithProvider` (type-only import) |
| Framework rules                                   | `tests/component-view/COMPONENT_VIEW_TEST_RULES.md`   |
| Routes                                            | `app/constants/navigation/Routes.ts`                  |
