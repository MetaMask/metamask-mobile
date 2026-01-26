import { SmokeWalletPlatform } from '../../tags';
import TestHelpers from '../../helpers';
import WalletView from '../../pages/wallet/WalletView';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../../tests/framework/Assertions';
import Matchers from '../../../tests/framework/Matchers';
import Gestures from '../../../tests/framework/Gestures';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { setupRemoteFeatureFlagsMock } from '../../../tests/api-mocking/helpers/remoteFeatureFlagsHelper';
import { Mockttp } from 'mockttp';
import { LocalNode, LocalNodeType } from '../../../tests/framework/types';
import { AnvilPort } from '../../../tests/framework/fixtures/FixtureUtils';
import { AnvilManager } from '../../../tests/seeder/anvil-manager';
import TransactionPayConfirmation from '../../pages/Confirmation/TransactionPayConfirmation';
import FooterActions from '../../pages/Browser/Confirmations/FooterActions';
import { EARN_TEST_IDS } from '../../../app/components/UI/Earn/constants/testIds';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { merge } from 'lodash';
import { toChecksumAddress } from '../../../app/util/address';

// USDC token on Mainnet
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const MUSD_ADDRESS = '0xaca92e438df0b2401ff60da7e4337b687a2435da';
const USDC_DECIMALS = 6;
const MUSD_DECIMALS = 6;

const createMusdFixture = (
  node: AnvilManager,
  options: {
    musdConversionEducationSeen: boolean;
    hasMusdBalance?: boolean;
    musdBalance?: number;
  },
) => {
  const rpcPort =
    node instanceof AnvilManager ? (node.getPort() ?? AnvilPort()) : undefined;

  const fixture = new FixtureBuilder()
    .withNetworkController({
      providerConfig: {
        chainId: CHAIN_IDS.MAINNET,
        rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
        type: 'custom',
        nickname: 'Localhost',
        ticker: 'ETH',
      },
    })
    .withNetworkEnabledMap({
      eip155: { [CHAIN_IDS.MAINNET]: true },
    })
    .withMetaMetricsOptIn()
    .withTokensForAllPopularNetworks([
      {
        address: toChecksumAddress(
          '0x0000000000000000000000000000000000000000',
        ),
        symbol: 'ETH',
        decimals: 18,
        name: 'Ethereum',
      },
      {
        address: toChecksumAddress(USDC_ADDRESS),
        symbol: 'USDC',
        decimals: USDC_DECIMALS,
        name: 'USDCoin',
      },
      {
        address: toChecksumAddress(MUSD_ADDRESS),
        symbol: 'MUSD',
        decimals: MUSD_DECIMALS,
        name: 'MUSD',
      },
    ])
    // Pre-populate token rates to avoid NaN values in UI
    .withTokenRates(
      CHAIN_IDS.MAINNET,
      toChecksumAddress('0x0000000000000000000000000000000000000000'),
      3000.0, // ETH price in USD
    )
    .withTokenRates(
      CHAIN_IDS.MAINNET,
      toChecksumAddress(USDC_ADDRESS),
      1.0, // USDC price in USD
    )
    .withTokenRates(
      CHAIN_IDS.MAINNET,
      toChecksumAddress(MUSD_ADDRESS),
      1.0, // mUSD price in USD
    )
    .build();

  // Set musdConversionEducationSeen
  merge(fixture.state.user, {
    musdConversionEducationSeen: options.musdConversionEducationSeen,
  });

  // Ensure CurrencyRateController has conversion rate for ETH
  if (!fixture.state.engine.backgroundState.CurrencyRateController) {
    merge(fixture.state.engine.backgroundState, {
      CurrencyRateController: {
        currentCurrency: 'usd',
        currencyRates: {},
      },
    });
  }
  merge(fixture.state.engine.backgroundState.CurrencyRateController, {
    currentCurrency: 'usd',
    currencyRates: {
      ETH: {
        conversionDate: Date.now() / 1000,
        conversionRate: 3000.0,
        usdConversionRate: 3000.0,
      },
    },
  });

  // Add mUSD balance if requested
  // Structure: tokenBalances[accountAddress][chainId][tokenAddress]
  if (options.hasMusdBalance) {
    // Get the selected account address from AccountsController
    const accountsController =
      fixture.state.engine.backgroundState.AccountsController;
    const selectedAccountId =
      accountsController?.internalAccounts?.selectedAccount;
    const selectedAccount =
      accountsController?.internalAccounts?.accounts?.[selectedAccountId];
    const accountAddress = selectedAccount?.address;

    if (!accountAddress) {
      throw new Error(
        'Cannot set mUSD balance: selected account address not found in fixture',
      );
    }

    // Ensure tokenBalances structure exists
    if (!fixture.state.engine.backgroundState.TokenBalancesController) {
      merge(fixture.state.engine.backgroundState, {
        TokenBalancesController: {
          tokenBalances: {},
        },
      });
    }

    if (
      !fixture.state.engine.backgroundState.TokenBalancesController
        .tokenBalances
    ) {
      fixture.state.engine.backgroundState.TokenBalancesController.tokenBalances =
        {};
    }

    // Set balance in correct structure: tokenBalances[accountAddress][chainId][tokenAddress]
    // Use address as-is from AccountsController to match selector lookup
    const accountAddressKey = accountAddress;
    const chainIdKey = CHAIN_IDS.MAINNET;
    const tokenAddressKey = toChecksumAddress(MUSD_ADDRESS);
    const balanceValue = ((options.musdBalance ?? 10) * 10 ** MUSD_DECIMALS)
      .toString(16)
      .replace(/^/, '0x');

    if (
      !fixture.state.engine.backgroundState.TokenBalancesController
        .tokenBalances[accountAddressKey]
    ) {
      fixture.state.engine.backgroundState.TokenBalancesController.tokenBalances[
        accountAddressKey
      ] = {};
    }

    if (
      !fixture.state.engine.backgroundState.TokenBalancesController
        .tokenBalances[accountAddressKey][chainIdKey]
    ) {
      fixture.state.engine.backgroundState.TokenBalancesController.tokenBalances[
        accountAddressKey
      ][chainIdKey] = {};
    }

    fixture.state.engine.backgroundState.TokenBalancesController.tokenBalances[
      accountAddressKey
    ][chainIdKey][tokenAddressKey] = balanceValue;
  }

  return fixture;
};

const commonMockSetup = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(mockServer, {
    earnMusdConversionFlowEnabled: { enabled: true },
    earnMusdCtaEnabled: { enabled: true },
    earnMusdConversionTokenListItemCtaEnabled: { enabled: true },
    earnMusdConversionAssetOverviewEnabled: { enabled: true },
    earnMusdConversionConvertibleTokensAllowlist: { '*': ['USDC'] },
    earnMusdConversionMinAssetBalanceRequired: 0.01,
  });
};

describe(SmokeWalletPlatform('mUSD Conversion Happy Path'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.launchApp();
  });

  it('converts USDC to mUSD successfully (First Time User)', async () => {
    await withFixtures(
      {
        fixture: ({ localNodes }: { localNodes?: LocalNode[] }) => {
          const node = localNodes?.[0] as unknown as AnvilManager;
          return createMusdFixture(node, {
            musdConversionEducationSeen: false,
          });
        },
        localNodeOptions: [
          {
            type: LocalNodeType.anvil,
            options: {
              chainId: 1,
            },
          },
        ],
        restartDevice: true,
        testSpecificMock: commonMockSetup,
      },
      async () => {
        await loginToApp();

        // Verify wallet is visible
        await Assertions.expectElementToBeVisible(WalletView.container, {
          description: 'Wallet view should be visible',
        });

        // Verify mUSD CTA is visible
        const musdCta = Matchers.getElementByID(
          EARN_TEST_IDS.MUSD.ASSET_LIST_CONVERSION_CTA,
        );
        await Assertions.expectElementToBeVisible(musdCta, {
          description: 'mUSD conversion CTA should be visible',
        });

        // Tap on mUSD CTA
        await Gestures.tap(musdCta, {
          elemDescription: 'mUSD conversion CTA',
        });

        // Verify education screen is shown (first time)
        await Assertions.expectTextDisplayed('mUSD', {
          timeout: 10000,
          description: 'Education screen should be visible with mUSD heading',
        });

        // Look for Continue button
        const continueButton = Matchers.getElementByText('Continue');
        await Assertions.expectElementToBeVisible(continueButton, {
          timeout: 5000,
          description: 'Education screen continue button should be visible',
        });

        // Tap Continue on education screen
        await Gestures.tap(continueButton, {
          elemDescription: 'continue button on education screen',
        });

        // Verify custom amount/confirmation screen is shown
        await Assertions.expectElementToBeVisible(
          TransactionPayConfirmation.payWithRow,
          {
            timeout: 10000,
            description:
              'Pay with row should be visible on confirmation screen',
          },
        );

        // Enter amount and confirm
        await TransactionPayConfirmation.tapKeyboardAmount('10');
        await TransactionPayConfirmation.tapKeyboardContinueButton();

        // Verify confirmation details are visible
        await Assertions.expectElementToBeVisible(
          TransactionPayConfirmation.total,
          {
            timeout: 10000,
            description: 'Total amount should be visible',
          },
        );

        // Confirm the transaction
        await FooterActions.tapConfirmButton();

        // Verify transaction was created and we are back in wallet
        await Assertions.expectElementToBeVisible(WalletView.container, {
          timeout: 30000,
          description:
            'Wallet view should be visible after transaction confirmation',
        });
      },
    );
  });

  it('converts USDC to mUSD from Token List (Returning User)', async () => {
    await withFixtures(
      {
        fixture: ({ localNodes }: { localNodes?: LocalNode[] }) => {
          const node = localNodes?.[0] as unknown as AnvilManager;
          return createMusdFixture(node, {
            musdConversionEducationSeen: true,
            hasMusdBalance: true,
            musdBalance: 100,
          });
        },
        localNodeOptions: [
          {
            type: LocalNodeType.anvil,
            options: {
              chainId: 1,
            },
          },
        ],
        restartDevice: true,
        testSpecificMock: commonMockSetup,
      },
      async () => {
        await loginToApp();

        // Verify wallet is visible
        await Assertions.expectElementToBeVisible(WalletView.container, {
          description: 'Wallet view should be visible',
        });

        // Scroll to USDC token
        await WalletView.scrollToToken('USDC');

        // Verify "Convert to mUSD" CTA is visible on Token List Item
        // Note: The exact text might depend on the implementation, checking for "Convert to mUSD"
        const convertButton = Matchers.getElementByText('Convert to mUSD');
        await Assertions.expectElementToBeVisible(convertButton, {
          description: 'Convert to mUSD button should be visible on USDC item',
        });

        // Tap "Convert to mUSD"
        await Gestures.tap(convertButton, {
          elemDescription: 'Convert to mUSD button',
        });

        // Verify custom amount screen is shown immediately (Education skipped)
        await Assertions.expectElementToBeVisible(
          TransactionPayConfirmation.payWithRow,
          {
            timeout: 10000,
            description:
              'Pay with row should be visible on confirmation screen',
          },
        );

        // Enter amount and confirm
        await TransactionPayConfirmation.tapKeyboardAmount('5');
        await TransactionPayConfirmation.tapKeyboardContinueButton();

        // Confirm the transaction
        await FooterActions.tapConfirmButton();

        // Verify back in wallet
        await Assertions.expectElementToBeVisible(WalletView.container, {
          timeout: 30000,
          description:
            'Wallet view should be visible after transaction confirmation',
        });
      },
    );
  });

  it('converts USDC to mUSD from Asset Overview', async () => {
    await withFixtures(
      {
        fixture: ({ localNodes }: { localNodes?: LocalNode[] }) => {
          const node = localNodes?.[0] as unknown as AnvilManager;
          return createMusdFixture(node, {
            musdConversionEducationSeen: true,
          });
        },
        localNodeOptions: [
          {
            type: LocalNodeType.anvil,
            options: {
              chainId: 1,
            },
          },
        ],
        restartDevice: true,
        testSpecificMock: commonMockSetup,
      },
      async () => {
        await loginToApp();

        // Verify wallet is visible
        await Assertions.expectElementToBeVisible(WalletView.container, {
          description: 'Wallet view should be visible',
        });

        // Tap on USDC to go to Asset Overview
        await WalletView.tapOnToken('USDC');

        // Verify Asset Overview CTA is visible
        const assetOverviewCta = Matchers.getElementByID(
          EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA,
        );
        await Assertions.expectElementToBeVisible(assetOverviewCta, {
          timeout: 5000,
          description: 'Asset Overview mUSD CTA should be visible',
        });

        // Tap on CTA
        await Gestures.tap(assetOverviewCta, {
          elemDescription: 'Asset Overview mUSD CTA',
        });

        // Verify custom amount screen is shown
        await Assertions.expectElementToBeVisible(
          TransactionPayConfirmation.payWithRow,
          {
            timeout: 10000,
            description:
              'Pay with row should be visible on confirmation screen',
          },
        );

        // Enter amount and confirm
        await TransactionPayConfirmation.tapKeyboardAmount('5');
        await TransactionPayConfirmation.tapKeyboardContinueButton();

        // Confirm the transaction
        await FooterActions.tapConfirmButton();

        // Verify back in wallet (or wherever the flow redirects, likely wallet home)
        await Assertions.expectElementToBeVisible(WalletView.container, {
          timeout: 30000,
          description:
            'Wallet view should be visible after transaction confirmation',
        });
      },
    );
  });
});
