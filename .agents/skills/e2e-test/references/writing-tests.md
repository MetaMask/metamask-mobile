# Writing E2E Tests — Reference

## Spec File Location

| Test Type  | Directory                                   | Tag                                                                                    |
| ---------- | ------------------------------------------- | -------------------------------------------------------------------------------------- |
| Smoke      | `tests/smoke/<feature>/<name>.spec.ts`      | `SmokeE2E`, `SmokeTrade`, `SmokePredictions`, `SmokePerps`, `SmokeConfirmations`, etc. |
| Regression | `tests/regression/<feature>/<name>.spec.ts` | `RegressionTrade`, `RegressionWallet`, etc.                                            |

Import tags from `tests/tags.ts`. Check **`tests/tags.js`** for the full list and descriptions. Use the same tag as **existing specs in that feature folder** (e.g. `tests/smoke/predict/` uses `SmokeTrade`).

## Minimal Smoke Spec

```typescript
import { loginToApp } from '../../flows/wallet.flow';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SmokeE2E } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import MyFeatureView from '../../page-objects/MyFeature/MyFeatureView';

describe(SmokeE2E('My Feature'), () => {
  it('lands on feature screen after navigation', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await MyFeatureView.expectScreenVisible();
      },
    );
  });
});
```

## Regression Spec with API Mocking

```typescript
import { Mockttp } from 'mockttp';
import { loginToApp } from '../../flows/wallet.flow';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { RegressionTrade } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { setupMockRequest } from '../../api-mocking/mockHelpers';
import MyFeatureList from '../../page-objects/MyFeature/MyFeatureList';
import MyFeatureDetails from '../../page-objects/MyFeature/MyFeatureDetails';
import { createLogger, LogLevel } from '../../framework/logger';

const logger = createLogger({ name: 'MyFeatureSpec', level: LogLevel.INFO });

const testSpecificMock = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(mockServer, { myFeatureEnabled: true });
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: 'https://api.example.com/my-feature/data',
    response: { items: [{ id: '1', name: 'Item 1' }] },
    responseCode: 200,
  });
};

describe(RegressionTrade('My Feature Details Flow'), () => {
  it('opens details from list', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        logger.info('Starting my feature test');
        await loginToApp();
        await MyFeatureList.tapFirstItem();
        await MyFeatureDetails.expectScreenVisible();
      },
    );
  });
});
```

## FixtureBuilder Patterns

```typescript
// Basic (just logged-in wallet)
new FixtureBuilder().build();

// With popular networks enabled
new FixtureBuilder().withPopularNetworks().build();

// With Ganache local network
new FixtureBuilder().withGanacheNetwork().build();

// With dapp connected
new FixtureBuilder().withPermissionControllerConnectedToTestDapp().build();

// With specific tokens
new FixtureBuilder().withTokensControllerERC20().build();

// With contacts
new FixtureBuilder().withAddressBookControllerContactBob().build();
```

## Mandatory Rules

- Every spec uses `withFixtures` — no plain `beforeAll` / `afterAll` setup
- `restartDevice: true` for most tests (clean state)
- `loginToApp()` always the first call inside the fixture callback
- Test names: descriptive without 'should' prefix
- All gestures and assertions include `description`
- No direct `element(by.id())` calls in specs
- No `TestHelpers.delay()` or `setTimeout()`

**Synchronization:** Use `device.disableSynchronization()` only when the test hits **timeouts caused by timers or animations** (e.g. confirmation loading, animated modals). Avoid wrapping entire flows by default. Re-enable with `device.enableSynchronization()` after the problematic section. See running-tests.md for the animation tip.

## Before submitting

- [ ] `withFixtures` + correct tag (see table above)
- [ ] Only Page Object methods in spec; no direct selectors
- [ ] Every gesture and assertion has a `description`
- [ ] No `TestHelpers.delay()` or `setTimeout()`
- [ ] `yarn lint <files>` and `yarn lint:tsc` pass
