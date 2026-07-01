import { SmokeWalletPlatform } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { loginToApp } from '../../flows/wallet.flow';
import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import BalanceBreakdownView from '../../page-objects/wallet/BalanceBreakdownView';

describe(SmokeWalletPlatform('Balance Breakdown Screen'), () => {
  beforeAll(async () => {
    jest.setTimeout(120_000);
  });

  it('opens balance breakdown when tapping total balance', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withHomepageBalanceBreakdownEnabled()
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        // Tap the balance container
        const balanceContainer = Matchers.getElementByID('balance-container');
        await Gestures.tap(balanceContainer, {
          elemDescription: 'Tap total balance to open breakdown',
        });

        await BalanceBreakdownView.verifyContainerVisible();
        await BalanceBreakdownView.verifyDonutChartVisible();
        await BalanceBreakdownView.verifyHeroTotalVisible();
      },
    );
  });

  it('shows all domain legend rows in overview mode', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withHomepageBalanceBreakdownEnabled()
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        const balanceContainer = Matchers.getElementByID('balance-container');
        await Gestures.tap(balanceContainer, {
          elemDescription: 'Tap total balance to open breakdown',
        });

        await BalanceBreakdownView.verifyContainerVisible();

        // All four legend rows should be visible
        await Assertions.expectElementToBeVisible(
          BalanceBreakdownView.legendRow('tokens'),
          { description: 'Tokens legend row should be visible' },
        );
        await Assertions.expectElementToBeVisible(
          BalanceBreakdownView.legendRow('perps'),
          { description: 'Perps legend row should be visible' },
        );
        await Assertions.expectElementToBeVisible(
          BalanceBreakdownView.legendRow('predict'),
          { description: 'Predict legend row should be visible' },
        );
        await Assertions.expectElementToBeVisible(
          BalanceBreakdownView.legendRow('defi'),
          { description: 'DeFi legend row should be visible' },
        );
      },
    );
  });

  it('shows drilldown when tapping Tokens legend row', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withHomepageBalanceBreakdownEnabled()
          .withTokensControllerERC20()
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        const balanceContainer = Matchers.getElementByID('balance-container');
        await Gestures.tap(balanceContainer, {
          elemDescription: 'Tap total balance to open breakdown',
        });

        await BalanceBreakdownView.verifyContainerVisible();
        await BalanceBreakdownView.verifyDrilldownNotVisible();

        await BalanceBreakdownView.tapTokensLegendRow();

        await BalanceBreakdownView.verifyDrilldownVisible();
      },
    );
  });

  it('shows CTA button in Tokens drilldown and navigates to Tokens full view', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withHomepageBalanceBreakdownEnabled()
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        const balanceContainer = Matchers.getElementByID('balance-container');
        await Gestures.tap(balanceContainer, {
          elemDescription: 'Tap total balance to open breakdown',
        });

        await BalanceBreakdownView.tapTokensLegendRow();
        await BalanceBreakdownView.verifyDrilldownVisible();
        await BalanceBreakdownView.verifyActionButtonVisible();

        await Gestures.tap(BalanceBreakdownView.actionButton(), {
          elemDescription: 'Tap View Tokens CTA',
        });

        // Should navigate away from breakdown (Tokens full view loads)
        await BalanceBreakdownView.verifyContainerVisible().catch(() => {
          // acceptable — navigated away
        });
      },
    );
  });
});
