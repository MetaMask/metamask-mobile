import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeMoney } from '../../tags.js';
import Assertions from '../../framework/Assertions.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { authenticatedCardTestSpecificMock } from '../../api-mocking/mock-responses/card/baanx-authenticated-mocks.js';
import { cardHomeSmokeExpectations } from '../../helpers/analytics/expectations/card-home-smoke.analytics.js';
import CardHomeView from '../../page-objects/Card/CardHomeView.js';
import AssetSelectionView from '../../page-objects/Card/AssetSelectionView.js';
import SpendingLimitView from '../../page-objects/Card/SpendingLimitView.js';
import CashbackView from '../../page-objects/Card/CashbackView.js';
import {
  buildCardHomeFixture,
  loginAndOpenCardHome,
  loginToCardViaChangeAsset,
  pressDeviceBack,
} from './helpers/card-helpers.js';

/**
 * Cashback validation smoke test
 */
appiumTest.describe(SmokeMoney('CardHome - Smoke'), () => {
  appiumTest.describe.configure({ timeout: 180000 });

  appiumTest(
    'covers Add Funds, login, Asset Selection, Spending Limit, and Cashback',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: buildCardHomeFixture(),
          restartDevice: true,
          testSpecificMock: authenticatedCardTestSpecificMock,
          analyticsExpectations: cardHomeSmokeExpectations,
          currentDeviceDetails,
        },
        async () => {
          await loginAndOpenCardHome();

          // Teaser: Add Funds bottom sheet
          await CardHomeView.tapAddFundsButton();
          await Assertions.expectElementToBeVisible(
            CardHomeView.addFundsBottomSheetDepositOption,
            {
              elemDescription:
                'Add Funds Bottom Sheet Deposit Option in Card Home View',
            },
          );
          await Assertions.expectElementToBeVisible(
            CardHomeView.addFundsBottomSheetSwapOption,
            {
              elemDescription:
                'Add Funds Bottom Sheet Swap Option in Card Home View',
            },
          );
          await pressDeviceBack();
          await Assertions.expectElementToBeVisible(CardHomeView.cardViewTitle);

          // Teaser auth gate + mocked Baanx login (Change Asset entry)
          await loginToCardViaChangeAsset();

          // Authenticated: Asset Selection
          await CardHomeView.tapChangeAssetButton();
          await Assertions.expectElementToBeVisible(
            AssetSelectionView.lineaUsdcItem,
            {
              elemDescription: 'Linea USDC asset in Asset Selection',
            },
          );
          await pressDeviceBack();
          await Assertions.expectElementToBeVisible(CardHomeView.cardViewTitle);

          // Authenticated: Spending Limit
          await CardHomeView.tapManageSpendingLimitItem();
          await Assertions.expectElementToBeVisible(
            SpendingLimitView.spendingLimitRow,
            {
              elemDescription: 'Spending Limit row',
            },
          );
          await Assertions.expectElementToBeVisible(
            SpendingLimitView.tokenRow,
            {
              elemDescription: 'Spending Limit token row',
            },
          );
          await pressDeviceBack();
          await Assertions.expectElementToBeVisible(CardHomeView.cardViewTitle);

          // Authenticated: Cashback (view only)
          await CardHomeView.tapCashbackItem();
          await Assertions.expectElementToBeVisible(CashbackView.container);
          await Assertions.expectElementToBeVisible(CashbackView.balanceTitle);
          await Assertions.expectElementToBeVisible(
            CashbackView.withdrawButton,
            {
              elemDescription: 'Cashback withdraw button',
            },
          );
        },
      );
    },
  );
});
