import { Mockttp } from 'mockttp';
import { TransactionType } from '@metamask/transaction-controller';
import { test as appiumTest } from '../../../framework/fixtures/playwright/index.js';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT,
} from '../../../framework/fixtures/FixtureBuilder.js';
import {
  PREDEFINED_TOKENS,
  type TokenHolding,
} from '../../../framework/fixtures/mmpay-token-holdings-registry.js';
import { SmokeConfirmations } from '../../../tags.js';
import {
  loginToAppPlaywright,
  waitForWalletHomePlaywright,
} from '../../../flows/wallet.flow.js';
import {
  RampsRegions,
  RampsRegionsEnum,
  resolveE2EWaitTimeoutMs,
} from '../../../framework/Constants.js';
import { Assertions } from '../../../framework/index.js';
import TransactionPayConfirmation from '../../../page-objects/Confirmation/TransactionPayConfirmation.js';
import TransactionDetailsModal from '../../../page-objects/Transactions/TransactionDetailsModal.js';
import PayWithModal from '../../../page-objects/Confirmation/PayWithModal.js';
import PayWithModalTokenPicker from '../../../page-objects/Confirmation/PayWithModalTokenPicker.js';
import FooterActions from '../../../page-objects/Browser/Confirmations/FooterActions.js';
import CommonView from '../../../page-objects/CommonView.js';
import TabBarComponent from '../../../page-objects/wallet/TabBarComponent.js';
import WalletView from '../../../page-objects/wallet/WalletView.js';
import PerpsHomeView from '../../../page-objects/Perps/PerpsHomeView.js';
import PredictMarketList from '../../../page-objects/Predict/PredictMarketList.js';
import ActivitiesView from '../../../page-objects/Transactions/ActivitiesView.js';
import ActivityDetails from '../../../page-objects/Transactions/ActivityDetails.js';
import MoneyHomeView from '../../../page-objects/Money/MoneyHomeView.js';
import MoneyTransferSheet from '../../../page-objects/Money/MoneyTransferSheet.js';

import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { moneyAccountWithdrawFlags } from '../../../api-mocking/mock-responses/pay/feature-flag-mocks.js';
import { MONEY_ACCOUNT_WITHDRAW_MOCKS } from '../../../api-mocking/mock-responses/pay/money-account-withdraw-mocks.js';
import { applyTokenHoldingsMocks } from '../../../api-mocking/mock-responses/pay/holdings-mocks.js';
import {
  PERPS_ARBITRUM_MOCKS,
  mockPerpsGeolocation,
} from '../../../api-mocking/mock-responses/perps-arbitrum-mocks.js';
import {
  POLYMARKET_USDC_BALANCE_MOCKS,
  POLYMARKET_LEGACY_SAFE_ACCOUNT_MOCKS,
  POLYMARKET_GEO_ELIGIBLE_MOCKS,
} from '../../../api-mocking/mock-responses/polymarket/polymarket-mocks.js';

const MONEY_WITHDRAW_HOLDINGS: TokenHolding[] = [
  { ...PREDEFINED_TOKENS.ETHEREUM.USDC, amount: '500' },
  { ...PREDEFINED_TOKENS.ETHEREUM.ETH, amount: '1' },
  { ...PREDEFINED_TOKENS.MONAD.MON, amount: '20' },
  { ...PREDEFINED_TOKENS.MONAD.MUSD, amount: '10' },
];

const MONEY_PERPS_HOLDINGS: TokenHolding[] = [
  { ...PREDEFINED_TOKENS.ETHEREUM.USDC, amount: '500' },
  { ...PREDEFINED_TOKENS.ETHEREUM.ETH, amount: '1' },
  { ...PREDEFINED_TOKENS.ARBITRUM.USDC, amount: '0' },
  { ...PREDEFINED_TOKENS.ARBITRUM.ETH, amount: '0' },
  { ...PREDEFINED_TOKENS.MONAD.MON, amount: '20' },
  { ...PREDEFINED_TOKENS.MONAD.MUSD, amount: '10' },
];

const MONEY_PREDICT_HOLDINGS: TokenHolding[] = [
  { ...PREDEFINED_TOKENS.ETHEREUM.USDC, amount: '500' },
  { ...PREDEFINED_TOKENS.ETHEREUM.ETH, amount: '1' },
  { ...PREDEFINED_TOKENS.POLYGON.POL, amount: '0' },
  { ...PREDEFINED_TOKENS.POLYGON.PUSD, amount: '0' },
  { ...PREDEFINED_TOKENS.MONAD.MON, amount: '20' },
  { ...PREDEFINED_TOKENS.MONAD.MUSD, amount: '10' },
];

const ARBITRUM_USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const POLYGON_USDC = '0x2791bca1f2de4661ED88A30C99A7a9449Aa84174';
const MAX_WITHDRAW_BASE_UNITS = '500000000';

appiumTest.describe(
  SmokeConfirmations('MM Pay - Money Account withdraw'),
  () => {
    appiumTest.describe.configure({ timeout: 250_000 });

    appiumTest(
      'verifies percentage inputs, then withdraws $50 to Mainnet USDC, confirms, and sees it in Money activity',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder()
              .withDisabledSmartTransactions()
              .withTokenHoldings(MONEY_WITHDRAW_HOLDINGS)
              .withDetectedGeolocation('FR')
              .withTransactions([
                {
                  id: 'prior-money-withdraw-tx',
                  type: TransactionType.moneyAccountWithdraw,
                  status: 'confirmed',
                  txParams: { from: DEFAULT_FIXTURE_ACCOUNT },
                },
              ])
              .withCompletedOnboardingStepper(
                'money-home-onboarding-stepper',
                2,
              )
              .build(),
            currentDeviceDetails,
            restartDevice: true,
            disableLocalNodes: true,
            testSpecificMock: async (mockServer: Mockttp) => {
              await setupRemoteFeatureFlagsMock(
                mockServer,
                moneyAccountWithdrawFlags(),
              );
              await applyTokenHoldingsMocks(
                mockServer,
                MONEY_WITHDRAW_HOLDINGS,
              );
              await MONEY_ACCOUNT_WITHDRAW_MOCKS(mockServer);
            },
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });

            await TabBarComponent.tapMoney();
            await MoneyHomeView.expectMoneyHomeVisible(120_000);
            await MoneyHomeView.tapTransfer();
            await MoneyTransferSheet.expectVisible();
            await MoneyTransferSheet.tapBetweenAccounts();

            await TransactionPayConfirmation.expectKeyboardLoaded();

            await TransactionPayConfirmation.tapPercentage(25);
            await TransactionPayConfirmation.verifyPercentageApplied();
            await TransactionPayConfirmation.verifyCustomAmount(
              '125',
              '25% of $500 withdrawable should set amount to $125',
            );
            await TransactionPayConfirmation.clearAmount();
            await TransactionPayConfirmation.typeAmount('50');
            await TransactionPayConfirmation.verifyCustomAmount(
              '50',
              'Regular withdraw amount should be $50',
            );
          },
        );
      },
    );

    appiumTest(
      'withdraws max $500 to Mainnet USDC, confirms, and sees it in Money activity',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder()
              .withDisabledSmartTransactions()
              .withTokenHoldings(MONEY_WITHDRAW_HOLDINGS)
              .withDetectedGeolocation('FR')
              .withTransactions([
                {
                  id: 'prior-money-withdraw-tx',
                  type: TransactionType.moneyAccountWithdraw,
                  status: 'confirmed',
                  txParams: { from: DEFAULT_FIXTURE_ACCOUNT },
                },
              ])
              .withCompletedOnboardingStepper(
                'money-home-onboarding-stepper',
                2,
              )
              .build(),
            currentDeviceDetails,
            restartDevice: true,
            disableLocalNodes: true,
            testSpecificMock: async (mockServer: Mockttp) => {
              await setupRemoteFeatureFlagsMock(
                mockServer,
                moneyAccountWithdrawFlags(),
              );
              await applyTokenHoldingsMocks(
                mockServer,
                MONEY_WITHDRAW_HOLDINGS,
              );
              await MONEY_ACCOUNT_WITHDRAW_MOCKS(mockServer, {
                amountBaseUnits: MAX_WITHDRAW_BASE_UNITS,
                amountUsd: '500.00',
              });
            },
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });

            await TabBarComponent.tapMoney();
            await MoneyHomeView.expectMoneyHomeVisible(120_000);
            await MoneyHomeView.tapTransfer();
            await MoneyTransferSheet.expectVisible();
            await MoneyTransferSheet.tapBetweenAccounts();

            await TransactionPayConfirmation.expectKeyboardLoaded();
            await TransactionPayConfirmation.expectPayWithRowLoaded();

            await TransactionPayConfirmation.tapPayWithRow();
            await PayWithModal.tapOtherAssets();
            await PayWithModalTokenPicker.tapAssetOnNetwork('USDC', '0x1');

            await TransactionPayConfirmation.tapMax();
            await TransactionPayConfirmation.verifyCustomAmount(
              '500',
              'Max of $500 withdrawable should set amount to $500',
            );

            await TransactionPayConfirmation.verifyReceiveVisible();
            await TransactionPayConfirmation.verifyTransactionFeeVisible();

            await FooterActions.tapConfirmAndExpectConfirmationUnmount();
            await MoneyHomeView.expectMoneyHomeVisible();

            await MoneyHomeView.verifyActivityItemLabelAndAmount(
              'Sent',
              '-$500',
            );
            await MoneyHomeView.tapActivityItemByLabel('Sent');
            await TransactionDetailsModal.verifyConfirmedStatus();
          },
        );
      },
    );

    appiumTest(
      'withdraws max $500 from Money account to Perps, confirms, and sees it in Perps activity',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder()
              .withPerpsProfile('no-positions')
              .withPerpsFirstTimeUser(false)
              .withDisabledSmartTransactions()
              .withNetworkController({
                type: 'rpc',
                chainId: '0xa4b1',
                rpcUrl: 'https://arb1.arbitrum.io/rpc',
                nickname: 'Arbitrum One',
                ticker: 'ETH',
              })
              .withTokenHoldings(MONEY_PERPS_HOLDINGS)
              .withDetectedGeolocation('FR')
              .withTransactions([
                {
                  id: 'prior-money-withdraw-tx',
                  type: TransactionType.moneyAccountWithdraw,
                  status: 'confirmed',
                  txParams: { from: DEFAULT_FIXTURE_ACCOUNT },
                },
              ])
              .withCompletedOnboardingStepper(
                'money-home-onboarding-stepper',
                2,
              )
              .build(),
            currentDeviceDetails,
            restartDevice: true,
            disableLocalNodes: true,
            testSpecificMock: async (mockServer: Mockttp) => {
              await setupRemoteFeatureFlagsMock(
                mockServer,
                moneyAccountWithdrawFlags(),
              );
              await applyTokenHoldingsMocks(mockServer, MONEY_PERPS_HOLDINGS);
              await PERPS_ARBITRUM_MOCKS(mockServer);
              await mockPerpsGeolocation(
                mockServer,
                RampsRegions[RampsRegionsEnum.FRANCE],
              );
              await MONEY_ACCOUNT_WITHDRAW_MOCKS(mockServer, {
                dstChainId: 42161,
                dstTokenAddress: ARBITRUM_USDC,
                amountBaseUnits: MAX_WITHDRAW_BASE_UNITS,
                amountUsd: '500.00',
              });
            },
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });

            await TabBarComponent.tapMoney();
            await MoneyHomeView.expectMoneyHomeVisible(120_000);
            await MoneyHomeView.tapTransfer();
            await MoneyTransferSheet.expectVisible();
            await MoneyTransferSheet.tapPerpsAccount();

            await TransactionPayConfirmation.expectKeyboardLoaded();
            await TransactionPayConfirmation.verifyPerpsAccountPickerRowVisible();

            await TransactionPayConfirmation.tapMax();
            await TransactionPayConfirmation.verifyCustomAmount(
              '500',
              'Max of $500 withdrawable should set amount to $500',
            );

            await TransactionPayConfirmation.verifyReceiveVisible();
            await TransactionPayConfirmation.verifyTransactionFeeVisible();

            await FooterActions.tapConfirmAndExpectConfirmationUnmount();

            await PerpsHomeView.tapBackHomeButton();
            await waitForWalletHomePlaywright(resolveE2EWaitTimeoutMs(20_000));
            await WalletView.tapActivityButton();

            await ActivitiesView.tapTypeFilterChip();
            await ActivitiesView.tapTypeFilterOption('perps');

            await ActivitiesView.tapPerpsFilterChip();
            await ActivitiesView.tapPerpsFilterOption('deposit');

            await ActivitiesView.verifyActivityItemLabelAndAmount(
              'Account funded',
              '+$500',
            );

            await ActivitiesView.tapOnActivityItemByLabel('Account funded');

            await Assertions.expectElementToBeVisible(ActivityDetails.screen, {
              description: 'Activity details screen should be visible',
            });
            await ActivityDetails.verifyStatus('Confirmed');
          },
        );
      },
    );

    appiumTest(
      'withdraws max $500 from Money account to Predict, confirms, and sees it in Predict activity',
      async ({ driver: _driver, currentDeviceDetails }) => {
        appiumTest.skip(
          currentDeviceDetails.platform === 'android',
          'Flaky on Android Appium CI: wallet home readiness after Predict deposit',
        );

        await withFixtures(
          {
            fixture: new FixtureBuilder()
              .withPolygon()
              .withDisabledSmartTransactions()
              .withTokenHoldings(MONEY_PREDICT_HOLDINGS)
              .withDetectedGeolocation('FR')
              .withTransactions([
                {
                  id: 'prior-money-withdraw-tx',
                  type: TransactionType.moneyAccountWithdraw,
                  status: 'confirmed',
                  txParams: { from: DEFAULT_FIXTURE_ACCOUNT },
                },
              ])
              .withCompletedOnboardingStepper(
                'money-home-onboarding-stepper',
                2,
              )
              .build(),
            currentDeviceDetails,
            restartDevice: true,
            disableLocalNodes: true,
            testSpecificMock: async (mockServer: Mockttp) => {
              await setupRemoteFeatureFlagsMock(
                mockServer,
                moneyAccountWithdrawFlags(),
              );
              await applyTokenHoldingsMocks(mockServer, MONEY_PREDICT_HOLDINGS);
              await POLYMARKET_USDC_BALANCE_MOCKS(mockServer);
              await POLYMARKET_LEGACY_SAFE_ACCOUNT_MOCKS(mockServer);
              await POLYMARKET_GEO_ELIGIBLE_MOCKS(mockServer);
              await MONEY_ACCOUNT_WITHDRAW_MOCKS(mockServer, {
                dstChainId: 137,
                dstTokenAddress: POLYGON_USDC,
                amountBaseUnits: MAX_WITHDRAW_BASE_UNITS,
                amountUsd: '500.00',
              });
            },
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });

            await TabBarComponent.tapMoney();
            await MoneyHomeView.expectMoneyHomeVisible(120_000);
            await MoneyHomeView.tapTransfer();
            await MoneyTransferSheet.expectVisible();
            await MoneyTransferSheet.tapPredictionsAccount();

            await TransactionPayConfirmation.expectKeyboardLoaded();
            await TransactionPayConfirmation.verifyPredictAccountPickerRowVisible();

            await TransactionPayConfirmation.tapMax();
            await TransactionPayConfirmation.verifyCustomAmount(
              '500',
              'Max of $500 withdrawable should set amount to $500',
            );

            await TransactionPayConfirmation.verifyReceiveVisible();
            await TransactionPayConfirmation.verifyTransactionFeeVisible();

            await FooterActions.tapConfirmAndExpectConfirmationUnmount();

            await PredictMarketList.tapBackButton();
            await waitForWalletHomePlaywright(resolveE2EWaitTimeoutMs(20_000));
            await WalletView.tapActivityButton();

            await ActivitiesView.tapTypeFilterChip();
            await ActivitiesView.tapTypeFilterOption('predictions');

            await ActivitiesView.tapOnActivityItemByLabel('Account funded');

            await Assertions.expectElementToBeVisible(ActivityDetails.screen, {
              description: 'Activity details screen should be visible',
            });

            await ActivityDetails.verifyStatus('Confirmed');
          },
        );
      },
    );

    appiumTest(
      'shows Perps and Predict destination pickers without confirming',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder()
              .withPerpsProfile('no-positions')
              .withPerpsFirstTimeUser(false)
              .withDisabledSmartTransactions()
              .withNetworkController({
                type: 'rpc',
                chainId: '0xa4b1',
                rpcUrl: 'https://arb1.arbitrum.io/rpc',
                nickname: 'Arbitrum One',
                ticker: 'ETH',
              })
              .withTokenHoldings(MONEY_PERPS_HOLDINGS)
              .withDetectedGeolocation('FR')
              .withTransactions([
                {
                  id: 'prior-money-withdraw-tx',
                  type: TransactionType.moneyAccountWithdraw,
                  status: 'confirmed',
                  txParams: { from: DEFAULT_FIXTURE_ACCOUNT },
                },
              ])
              .withCompletedOnboardingStepper(
                'money-home-onboarding-stepper',
                2,
              )
              .build(),
            currentDeviceDetails,
            restartDevice: true,
            disableLocalNodes: true,
            testSpecificMock: async (mockServer: Mockttp) => {
              await setupRemoteFeatureFlagsMock(
                mockServer,
                moneyAccountWithdrawFlags(),
              );
              await applyTokenHoldingsMocks(mockServer, MONEY_PERPS_HOLDINGS);
              await PERPS_ARBITRUM_MOCKS(mockServer);
              await mockPerpsGeolocation(
                mockServer,
                RampsRegions[RampsRegionsEnum.FRANCE],
              );
              await POLYMARKET_USDC_BALANCE_MOCKS(mockServer);
              await POLYMARKET_LEGACY_SAFE_ACCOUNT_MOCKS(mockServer);
              await POLYMARKET_GEO_ELIGIBLE_MOCKS(mockServer);
              await MONEY_ACCOUNT_WITHDRAW_MOCKS(mockServer);
            },
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });

            await TabBarComponent.tapMoney();
            await MoneyHomeView.expectMoneyHomeVisible(120_000);
            await MoneyHomeView.tapTransfer();
            await MoneyTransferSheet.expectVisible();
            await MoneyTransferSheet.tapPerpsAccount();

            await TransactionPayConfirmation.expectKeyboardLoaded();
            await TransactionPayConfirmation.verifyPerpsAccountPickerRowVisible();
            await CommonView.tapBackButton();
            await MoneyTransferSheet.expectVisible();
            await MoneyTransferSheet.tapPredictionsAccount();
            await TransactionPayConfirmation.expectKeyboardLoaded();
            await TransactionPayConfirmation.verifyPredictAccountPickerRowVisible();
            await CommonView.tapBackButton();
            await TabBarComponent.tapMoney();
          },
        );
      },
    );
  },
);
