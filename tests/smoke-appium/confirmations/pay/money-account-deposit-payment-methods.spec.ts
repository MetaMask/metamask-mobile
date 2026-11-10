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
import TabBarComponent from '../../../page-objects/wallet/TabBarComponent.js';
import MoneyHomeView from '../../../page-objects/Money/MoneyHomeView.js';
import MoneyAddMoneySheet from '../../../page-objects/Money/MoneyAddMoneySheet.js';

import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { moneyAccountDepositFlags } from '../../../api-mocking/mock-responses/pay/feature-flag-mocks.js';
import { MONEY_ACCOUNT_DEPOSIT_MOCKS } from '../../../api-mocking/mock-responses/pay/money-account-deposit-mocks.js';
import { applyTokenHoldingsMocks } from '../../../api-mocking/mock-responses/pay/holdings-mocks.js';
import {
  BUY_ORDER_STATUS_MOCKS,
  setupRegionAwareOnRampMocks,
  RAMPS_QUOTE_MOCKS,
} from '../../../api-mocking/mock-responses/ramps/ramps-mocks.js';
import {
  RampsRegions,
  RampsRegionsEnum,
} from '../../../framework/Constants.js';

const MONEY_DEPOSIT_HOLDINGS: TokenHolding[] = [
  { ...PREDEFINED_TOKENS.ETHEREUM.USDC, amount: '500' },
  { ...PREDEFINED_TOKENS.ETHEREUM.ETH, amount: '1' },
  { ...PREDEFINED_TOKENS.MONAD.MON, amount: '20' },
  { ...PREDEFINED_TOKENS.MONAD.MUSD, amount: '10' },
];

const MONEY_DEPOSIT_ETH_HOLDINGS: TokenHolding[] = [
  { ...PREDEFINED_TOKENS.ETHEREUM.USDC, amount: '500' },
  { ...PREDEFINED_TOKENS.ETHEREUM.ETH, amount: '1' },
];

function moneyAccountDepositEthFlags(): Record<string, unknown> {
  const flags = moneyAccountDepositFlags();
  const payTokens = flags.confirmations_pay_tokens as {
    preferredTokens: {
      default: unknown[];
      overrides: Record<string, unknown>;
    };
  } & Record<string, unknown>;
  return {
    ...flags,
    confirmations_pay_tokens: {
      ...payTokens,
      preferredTokens: {
        ...payTokens.preferredTokens,
        overrides: {
          ...payTokens.preferredTokens.overrides,
          moneyAccountDeposit: [
            {
              address: '0x0000000000000000000000000000000000000000',
              chainId: '0x1',
              name: 'ETH',
              successRate: 100,
            },
          ],
        },
      },
    },
  };
}

function buildDepositFixture(
  holdings: TokenHolding[] = MONEY_DEPOSIT_HOLDINGS,
) {
  return new FixtureBuilder()
    .withDisabledSmartTransactions()
    .withTokenHoldings(holdings)
    .withDetectedGeolocation('FR')
    .withTransactions([
      {
        id: 'prior-money-deposit-tx',
        type: TransactionType.moneyAccountDeposit,
        status: 'confirmed',
        txParams: { from: DEFAULT_FIXTURE_ACCOUNT },
      },
    ])
    .withCompletedOnboardingStepper('money-home-onboarding-stepper', 2)
    .build();
}

appiumTest.describe(
  SmokeConfirmations('MM Pay - Money Account deposit payment methods'),
  () => {
    appiumTest.describe.configure({ timeout: 250_000 });

    appiumTest(
      'selects fiat payment when opening via pay with debit / credit',
      async ({ driver: _driver, currentDeviceDetails }) => {
        appiumTest.skip(
          currentDeviceDetails.platform === 'android',
          'Transaction Pay fiat test options require iOS launch arguments',
        );

        await withFixtures(
          {
            fixture: buildDepositFixture(),
            currentDeviceDetails,
            restartDevice: true,
            disableLocalNodes: true,
            launchArgs: {
              transactionPayFiatTestFundingSource: DEFAULT_FIXTURE_ACCOUNT,
              transactionPayFiatTestAmountOverride: '0.016666666666666666',
            },
            testSpecificMock: async (mockServer: Mockttp) => {
              await setupRemoteFeatureFlagsMock(
                mockServer,
                moneyAccountDepositFlags(),
              );
              await applyTokenHoldingsMocks(mockServer, MONEY_DEPOSIT_HOLDINGS);
              await MONEY_ACCOUNT_DEPOSIT_MOCKS(mockServer, 'eth');
              await setupRegionAwareOnRampMocks(
                mockServer,
                RampsRegions[RampsRegionsEnum.FRANCE],
              );
              await RAMPS_QUOTE_MOCKS(mockServer, 'native');
              await BUY_ORDER_STATUS_MOCKS(mockServer);
            },
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });

            await TabBarComponent.tapMoney();
            await MoneyHomeView.expectMoneyHomeVisible();
            await MoneyHomeView.tapAdd();
            await MoneyAddMoneySheet.expectVisible();
            await MoneyAddMoneySheet.tapDepositFunds();

            await TransactionPayConfirmation.expectPayWithRowLoaded();
            await Assertions.expectElementToHaveText(
              TransactionPayConfirmation.payWithSymbol,
              'Debit or Credit',
              {
                description:
                  'Fiat payment method should be auto-selected when opening via Deposit funds',
              },
            );
          },
        );
      },
    );

    appiumTest(
      'selects prefill token when opening via convert crypto',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: buildDepositFixture(MONEY_DEPOSIT_ETH_HOLDINGS),
            currentDeviceDetails,
            restartDevice: true,
            disableLocalNodes: true,
            testSpecificMock: async (mockServer: Mockttp) => {
              await setupRemoteFeatureFlagsMock(
                mockServer,
                moneyAccountDepositEthFlags(),
              );
              await applyTokenHoldingsMocks(
                mockServer,
                MONEY_DEPOSIT_ETH_HOLDINGS,
              );
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
            await Assertions.expectElementToHaveText(
              TransactionPayConfirmation.payWithSymbol,
              'ETH ($3,000)',
              {
                description:
                  'Convert crypto should prefill ETH on mainnet as the pay token',
              },
            );
          },
        );
      },
    );

    appiumTest(
      'selects mUSD when opening via add mUSD',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: buildDepositFixture(),
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
            await MoneyAddMoneySheet.tapMoveMusd();

            await TransactionPayConfirmation.expectPayWithRowLoaded();
            await Assertions.expectElementToHaveText(
              TransactionPayConfirmation.payWithSymbol,
              'mUSD ($10)',
              {
                description: 'Add mUSD should select mUSD as the pay token',
              },
            );
          },
        );
      },
    );
  },
);
