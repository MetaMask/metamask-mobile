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
import { loginToAppPlaywright } from '../../../flows/wallet.flow.js';
import { Assertions } from '../../../framework/index.js';
import TransactionPayConfirmation from '../../../page-objects/Confirmation/TransactionPayConfirmation.js';
import TransactionDetailsModal from '../../../page-objects/Transactions/TransactionDetailsModal.js';
import PayWithModal from '../../../page-objects/Confirmation/PayWithModal.js';
import PayWithModalTokenPicker from '../../../page-objects/Confirmation/PayWithModalTokenPicker.js';
import FooterActions from '../../../page-objects/Browser/Confirmations/FooterActions.js';
import TabBarComponent from '../../../page-objects/wallet/TabBarComponent.js';
import MoneyHomeView from '../../../page-objects/Money/MoneyHomeView.js';
import MoneyAddMoneySheet from '../../../page-objects/Money/MoneyAddMoneySheet.js';

import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { moneyAccountDepositFlags } from '../../../api-mocking/mock-responses/pay/feature-flag-mocks.js';
import { MONEY_ACCOUNT_DEPOSIT_MOCKS } from '../../../api-mocking/mock-responses/pay/money-account-deposit-mocks.js';
import { applyTokenHoldingsMocks } from '../../../api-mocking/mock-responses/pay/holdings-mocks.js';

const MONEY_DEPOSIT_HOLDINGS: TokenHolding[] = [
  { ...PREDEFINED_TOKENS.ETHEREUM.USDC, amount: '500' },
  { ...PREDEFINED_TOKENS.ETHEREUM.ETH, amount: '1' },
  { ...PREDEFINED_TOKENS.MONAD.MON, amount: '20' },
  { ...PREDEFINED_TOKENS.MONAD.MUSD, amount: '10' },
];

appiumTest.describe(
  SmokeConfirmations('MM Pay - Money Account deposit'),
  () => {
    appiumTest.describe.configure({ timeout: 250_000 });

    appiumTest(
      'verifies percentage inputs, then converts $50 with Mainnet USDC to mUSD on Monad, confirms, and sees it in Money activity',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder()
              .withDisabledSmartTransactions()
              .withTokenHoldings(MONEY_DEPOSIT_HOLDINGS)
              .withDetectedGeolocation('FR')
              .withTransactions([
                {
                  id: 'prior-money-deposit-tx',
                  type: TransactionType.moneyAccountDeposit,
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
                moneyAccountDepositFlags(),
              );
              await applyTokenHoldingsMocks(mockServer, MONEY_DEPOSIT_HOLDINGS);
              await MONEY_ACCOUNT_DEPOSIT_MOCKS(mockServer);
            },
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });

            await TabBarComponent.tapMoney();
            await MoneyHomeView.expectMoneyHomeVisible();
            await MoneyHomeView.tapAdd();
            await MoneyAddMoneySheet.expectVisible();
            await MoneyAddMoneySheet.tapConvertCrypto();

            await TransactionPayConfirmation.expectKeyboardLoaded();
            await TransactionPayConfirmation.expectPayWithRowLoaded();

            await TransactionPayConfirmation.tapPayWithRow();
            await PayWithModal.tapOtherAssets();
            await PayWithModalTokenPicker.tapAssetOnNetwork('USDC', '0x1');

            await TransactionPayConfirmation.tapPercentage(25);
            await TransactionPayConfirmation.verifyPercentageApplied();
            await TransactionPayConfirmation.verifyCustomAmount(
              '125',
              '25% of $500 USDC should set amount to $125',
            );
            await TransactionPayConfirmation.clearAmount();

            await TransactionPayConfirmation.tapPercentage(50);
            await TransactionPayConfirmation.verifyPercentageApplied();
            await TransactionPayConfirmation.verifyCustomAmount(
              '250',
              '50% of $500 USDC should set amount to $250',
            );
            await TransactionPayConfirmation.clearAmount();

            await TransactionPayConfirmation.enterAmountAndContinue('50');
            await TransactionPayConfirmation.verifyTransactionFeeVisible();

            await FooterActions.tapConfirmAndExpectConfirmationUnmount();
            await MoneyHomeView.expectMoneyHomeVisible();

            await MoneyHomeView.verifyActivityItemLabelAndAmount(
              'Converted',
              '+$50',
            );
            await MoneyHomeView.tapActivityItemByLabel('Converted');
            await TransactionDetailsModal.verifyConfirmedStatus();
          },
        );
      },
    );
  },
);
