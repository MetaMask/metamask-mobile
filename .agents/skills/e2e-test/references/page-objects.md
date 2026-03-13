# Page Objects & Selectors — Reference

## Page Object Location

```
tests/page-objects/
└── <Feature>/
    ├── MyFeatureView.ts        ← main screen PO
    ├── MyFeatureList.ts        ← list/modal PO
    └── MyFeatureDetailsView.ts ← detail screen PO
```

One class per screen or significant UI component.

## Full Page Object Template

```typescript
// tests/page-objects/Predict/PredictMarketList.ts
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import { Utilities } from '../../framework';
import { PredictMarketListSelectorsIDs } from '../../../app/components/UI/Predict/PredictMarketList.testIds';

class PredictMarketList {
  // --- Getters (element references, never interact directly in spec) ---

  get container() {
    return Matchers.getElementByID(PredictMarketListSelectorsIDs.CONTAINER);
  }

  get searchInput() {
    return Matchers.getElementByID(PredictMarketListSelectorsIDs.SEARCH_INPUT);
  }

  get firstCard() {
    return Matchers.getElementByID(PredictMarketListSelectorsIDs.FIRST_CARD);
  }

  // --- Action methods ---

  async tapFirstCard(): Promise<void> {
    await Gestures.tap(this.firstCard, {
      description: 'tap first market card',
    });
  }

  async typeSearchQuery(query: string): Promise<void> {
    await Gestures.typeText(this.searchInput, query, {
      description: `type search query: ${query}`,
    });
  }

  // --- Assertion methods ---

  async expectContainerVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.container, {
      description: 'market list container should be visible',
    });
  }

  async expectContainerNotVisible(): Promise<void> {
    await Assertions.expectElementToNotBeVisible(this.container, {
      description: 'market list container should not be visible',
    });
  }

  // --- Retry pattern for flaky interactions ---

  async tapFirstCardWithRetry(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await Gestures.tap(this.firstCard, {
          timeout: 2000,
          description: 'tap first card',
        });
        await Assertions.expectElementToBeVisible(this.firstCard, {
          timeout: 2000,
          description: 'first card visible',
        });
      },
      { timeout: 30000, description: 'tap first card and verify' },
    );
  }
}

export default new PredictMarketList();
```

## Selector / TestId Conventions

### Preferred: Co-locate with component

```typescript
// app/components/UI/Predict/PredictMarketList.testIds.ts
export const PredictMarketListSelectorsIDs = {
  CONTAINER: 'predict-market-list-container',
  SEARCH_INPUT: 'predict-market-list-search-input',
  FIRST_CARD: 'predict-market-list-first-card',
  CARD_TITLE: 'predict-market-list-card-title',
} as const;
```

Then use in the component:

```tsx
<View testID={PredictMarketListSelectorsIDs.CONTAINER}>
```

### Legacy: under tests/selectors/

```typescript
// tests/selectors/Predict/PredictMarketList.selectors.ts
export const PredictMarketListSelectorsIDs = {
  CONTAINER: 'predict-market-list-container',
} as const;
```

Use co-location for all new code.

### Prefer testID on the component; text/label only when needed

**Prefer adding a `testID` to the component** so the Page Object can use `Matchers.getElementByID()`. Add the `testID` in the app component and define the constant in the co-located `*.testIds.ts` (e.g. `PredictBalanceSelectorsIDs.WITHDRAW_BUTTON`). This keeps selectors stable and independent of copy/locale.

Use **text** (`getElementByText`) or **label** (`getElementByLabel`) selectors only when adding a testID is not feasible (e.g. third-party or legacy component you cannot change). In that case, define the string in a SelectorsText object in the same `*.testIds.ts` (e.g. from locale) and use it in the Page Object.

### Activity / transaction list assertions

To assert that a transaction appears in the Activity list (e.g. after deposit or withdraw):

- Use **ActivitiesView** (`tests/page-objects/Transactions/ActivitiesView.ts`): `tapOnPredictionsTab()`, then match the activity row by its type label.
- Activity type labels live in **ActivitiesView.testIds.ts** (`ActivitiesViewSelectorsText`, e.g. `PREDICT_DEPOSIT`, `PREDICT_WITHDRAW`). If your transaction type is missing, add it there and a getter in ActivitiesView (e.g. `get predictWithdraw()`), then use `Assertions.expectElementToBeVisible(ActivitiesView.predictWithdraw, { description: '...' })`.

## Matchers API

```typescript
// By testID (most common)
Matchers.getElementByID('my-test-id');

// By text
Matchers.getByText('Submit');

// By label (accessibility)
Matchers.getElementByLabel('Close button');
```

## Gestures API

```typescript
// Tap
await Gestures.tap(element, { description: 'tap X' });

// Tap with stability check (for animated elements)
await Gestures.tap(element, {
  checkStability: true,
  description: 'tap animated X',
});

// Tap disabled element
await Gestures.tap(element, {
  checkEnabled: false,
  description: 'tap loading button',
});

// Type text
await Gestures.typeText(input, 'hello', { description: 'type hello in input' });

// Swipe
await Gestures.swipe(element, 'up', 'slow', 0.5, { description: 'swipe up' });
```

## Assertions API

```typescript
// Visible
await Assertions.expectElementToBeVisible(element, { description: '...' });

// Not visible
await Assertions.expectElementToNotBeVisible(element, { description: '...' });

// Text present on screen
await Assertions.expectTextDisplayed('some text', { description: '...' });

// With custom timeout
await Assertions.expectElementToBeVisible(element, {
  description: '...',
  timeout: 10000,
});
```
