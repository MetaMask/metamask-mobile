# Homepage Sections A/B/C Test — Option B Summary

## 1) Why Route B (Selector + Wrapper Hook) — Benefits

- **Consistency with existing patterns**  
  The only production A/B test in the app that touches the swap/bridge flow (Token Details layout) uses Option B: a **variant selector** plus a **thin hook** that exposes variant name (and derived UI state). Reusing this pattern keeps the codebase consistent and makes the change easier to review and maintain.

- **Selector usable outside React**  
  Redux selectors can be used in sagas, middleware, or any non-component code. If you ever need the homepage variant in a saga (e.g. for conditional logic or analytics), you can use the selector directly. The generic `useABTest` hook is React-only.

- **Single source of truth for the flag shape**  
  The selector owns how we read the remote flag (e.g. `{ name }` from the controller after bucketing, optional version gating). Components depend on the hook, which depends on the selector, so flag-format changes are localized to the selector.

- **Easy to pass variant through navigation**  
  Token Details passes the variant name in route params to Bridge/Perps so downstream screens can attach the same `ab_tests` key to analytics. For homepage, you get the variant from the selector/hook and can pass it the same way if a user goes from homepage to another flow and you want to attribute events to the test.

- **Explicit, testable API**  
  A small hook like `useHomepageSectionsABCTest()` that returns `{ variantName, homepageUi, isTestActive }` is easy to unit test (mock the selector) and makes the contract clear for UI and analytics—including branching across **three** variants (control + 2 treatment UIs).

- **Optional version gating in one place**  
  If you still want a minimum app version for the test, you can enforce it inside the selector (e.g. read `minimumVersion` from a wrapped value and use `hasMinimumRequiredVersion`), mirroring Token Details, without spreading version checks across components.

---

## 2) How to Do It With the Sections Feature Flag

- **Current state**  
  `homepageSectionsV1` is a **version-gated boolean** flag. The selector `selectHomepageSectionsV1Enabled` uses `validatedVersionGatedFeatureFlag()` and returns `true`/`false` (sections vs tabs).

- **Target state (A/B/C test)**  
  Turn it into a **three-variant flag** (control + 2 treatment UIs):
  - **Control** → tabs (current default).
  - **Treatment A** → first sections UI.
  - **Treatment B** → second sections UI.

- **Option B approach**
  1. **Selector**  
     Add a variant selector (e.g. `selectHomepageSectionsTestVariant`) that:
     - Reads `remoteFeatureFlags.homepageSectionsV1`.
     - Handles the A/B/C test shape the controller writes after bucketing: `{ name: "control" | "treatmentA" | "treatmentB" }` (and optionally a wrapped form with `value: { variant, minimumVersion }` if you keep version gating).
     - Returns `'control' | 'treatmentA' | 'treatmentB' | null` (null when test is inactive or invalid).
  2. **Hook**  
     Add `useHomepageSectionsABCTest()` that:
     - Uses `useSelector(selectHomepageSectionsTestVariant)`.
     - Returns `variantName` (for analytics), `homepageUi: 'tabs' | 'sectionsA' | 'sectionsB'` (for rendering the correct UI), and `isTestActive: !!variant`.
  3. **Consumers**  
     Replace `selectHomepageSectionsV1Enabled` with this hook where the decision is made (e.g. Wallet view). Switch on `homepageUi` (or `variantName`) to render tabs vs sections UI A vs sections UI B, and use `variantName` / `isTestActive` for analytics (`ab_tests: { homepage_sections: variantName }`).
  4. **LaunchDarkly**  
     Change the flag from a version-gated boolean to the A/B/C test array format (three variants with `name` and `scope.value`). The existing Remote Feature Flag controller will bucket users and store `{ name }`.

No change to the generic `useABTest` hook is required; the implementation stays self-contained in the homepage feature-flag selector and a small hook.

---

## 3) Step-by-Step Implementation

### Step 1: LaunchDarkly

- Create or repurpose the flag `homepageSectionsV1`.
- Set the variation value to the **array format** used for A/B/C tests—**three variants** with cumulative `scope.value`:
  ```json
  [
    {
      "name": "control",
      "scope": { "type": "percentage_rollout", "value": 0.33 }
    },
    {
      "name": "treatmentA",
      "scope": { "type": "percentage_rollout", "value": 0.66 }
    },
    {
      "name": "treatmentB",
      "scope": { "type": "percentage_rollout", "value": 1.0 }
    }
  ]
  ```
- **Control** = tabs, **treatmentA** = first sections UI, **treatmentB** = second sections UI. Adjust `scope.value` for the desired split (e.g. 0.33 / 0.66 / 1.0 for 33% / 33% / 34%).
- If you need a minimum app version, configure it in LD targeting (e.g. rule that serves this variation only when app version ≥ X).

### Step 2: Add the variant selector

**File:** `app/selectors/featureFlagController/homepage/index.ts`

- Define valid variants for the A/B/C test, e.g. `['control', 'treatmentA', 'treatmentB'] as const`.
- Add `selectHomepageSectionsTestVariant`:
  - Input: `selectRemoteFeatureFlags`.
  - Read `remoteFeatureFlags.homepageSectionsV1`.
  - If the controller stores the bucketed result as `{ name: string }`, use that:
    - If `name` is one of the valid variants, return it; otherwise return `null`.
  - If you need version gating, support the wrapped shape (e.g. `value: { variant, minimumVersion }`) and use `hasMinimumRequiredVersion(minimumVersion)`; if the version check fails, return `null`.
- Keep `selectHomepageSectionsV1Enabled` for now if other code still depends on it, or make it a derived selector that returns `true` when variant is `'treatmentA'` or `'treatmentB'` (and `false` for `'control'` or `null`) so call sites can be migrated gradually.

### Step 3: Add the wrapper hook

**File:** e.g. `app/components/Views/Homepage/hooks/useHomepageSectionsABCTest.ts` (or next to the selector)

- `useSelector(selectHomepageSectionsTestVariant)`.
- Compute:
  - `variantName = variant ?? 'control'` (for analytics).
  - `homepageUi`: map variant to UI choice—e.g. `'tabs'` for control, `'sectionsA'` for treatmentA, `'sectionsB'` for treatmentB (so consumers can switch on one value to render the correct UI).
  - `isTestActive = variant !== null`.
- Return `{ variantName, homepageUi, isTestActive }`.

Example shape:

```ts
type HomepageUi = 'tabs' | 'sectionsA' | 'sectionsB';

// In hook:
const homepageUi: HomepageUi =
  variantName === 'control'
    ? 'tabs'
    : variantName === 'treatmentA'
      ? 'sectionsA'
      : 'sectionsB'; // treatmentB or fallback
```

### Step 4: Switch Wallet (and any other consumers) to the hook

**File:** `app/components/Views/Wallet/index.tsx`

- Remove `useSelector(selectHomepageSectionsV1Enabled)`.
- Use `const { variantName, homepageUi, isTestActive } = useHomepageSectionsABCTest();`.
- Replace layout logic: instead of a single “sections vs tabs” boolean, **switch on `homepageUi`** to render:
  - `homepageUi === 'tabs'` → current tabbed layout.
  - `homepageUi === 'sectionsA'` → first sections UI (e.g. existing `<Homepage />` or a sections-A-specific component).
  - `homepageUi === 'sectionsB'` → second sections UI (new component or variant).
- Apply the same `homepageUi` (or variant) to refresh logic and any other behavior that currently depends on “sections enabled.”
- Where you track analytics events for this flow, add:
  - `...(isTestActive && { ab_tests: { homepage_sections: variantName } })`.

### Step 5: Analytics

- Ensure key events (e.g. wallet viewed, section interacted) include `ab_tests: { homepage_sections: variantName }` when `isTestActive` is true. `variantName` will be `'control'`, `'treatmentA'`, or `'treatmentB'`.
- In Mixpanel (or your analytics tool), create a funnel or reports filtered/breakdown by `ab_tests.homepage_sections` so you can compare control vs treatmentA vs treatmentB.

### Step 6: Cleanup and tests

- **Selector tests**  
  In `app/selectors/featureFlagController/homepage/index.test.ts`:
  - Add tests for `selectHomepageSectionsTestVariant`: valid `{ name: 'control' }`, `{ name: 'treatmentA' }`, `{ name: 'treatmentB' }`, invalid or missing flag → `null`, and if you support version gating, version-below-min → `null`.
  - If `selectHomepageSectionsV1Enabled` is kept as a derived selector, add a test that it returns `true` when variant is `'treatmentA'` or `'treatmentB'` and `false` otherwise.
- **Hook tests**  
  Unit test `useHomepageSectionsABCTest` with a mocked selector (variant `null`, `'control'`, `'treatmentA'`, `'treatmentB'`) and assert `variantName`, `homepageUi`, `isTestActive`.
- **Wallet/consumer tests**  
  Update tests that depended on `selectHomepageSectionsV1Enabled` to mock the new selector or hook and assert the correct UI is rendered for each variant (tabs vs sections A vs sections B).
- When nothing uses `selectHomepageSectionsV1Enabled` anymore, you can remove it or leave it as a thin derived selector for backwards compatibility.

### Step 7: (Optional) Pass variant to other flows

- If users can navigate from the homepage to another flow (e.g. a specific section → Bridge or another tab) and you want to attribute those events to the homepage test, pass `variantName` (or a small context object) in route params and include the same `ab_tests.homepage_sections` key in those screens’ events, similar to how Token Details passes `assetsASSETS2493AbtestTokenDetailsLayout` to Bridge.

---

## Checklist

- [ ] LaunchDarkly flag updated to **A/B/C** array format: three variants with `name` + `scope.value` (e.g. control, treatmentA, treatmentB).
- [ ] `selectHomepageSectionsTestVariant` added and tested (all three variants + invalid/null).
- [ ] `useHomepageSectionsABCTest` hook added and tested; returns `variantName`, `homepageUi` (`'tabs' | 'sectionsA' | 'sectionsB'`), `isTestActive`.
- [ ] Wallet (and any other consumers) switch on `homepageUi` to render tabs vs sections UI A vs sections UI B.
- [ ] Analytics: `ab_tests.homepage_sections` added to relevant events when `isTestActive` (value will be `control` | `treatmentA` | `treatmentB`).
- [ ] Old selector deprecated or refactored to derived selector; tests updated.
- [ ] Mixpanel/analytics funnel or report set up for `ab_tests.homepage_sections` with breakdown by all three variants.
