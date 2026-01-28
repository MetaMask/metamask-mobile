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
import { setupMockRequest } from '../../../tests/api-mocking/helpers/mockHelpers';
import { Mockttp } from 'mockttp';
import { LocalNode, LocalNodeType } from '../../../tests/framework/types';
import { AnvilPort } from '../../../tests/framework/fixtures/FixtureUtils';
import { AnvilManager } from '../../../tests/seeder/anvil-manager';
import TransactionPayConfirmation from '../../pages/Confirmation/TransactionPayConfirmation';
import FooterActions from '../../pages/Browser/Confirmations/FooterActions';
import { EARN_TEST_IDS } from '../../../app/components/UI/Earn/constants/testIds';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { merge } from 'lodash';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { getDecodedProxiedURL } from '../notifications/utils/helpers';

// USDC token on Mainnet
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const MUSD_ADDRESS = '0xaca92e438df0b2401ff60da7e4337b687a2435da';
const USDC_DECIMALS = 6;
const MUSD_DECIMALS = 6;

const createMusdFixture = (
  node: AnvilManager,
  options: {
    musdConversionEducationSeen: boolean;
    hasUsdcBalance?: boolean;
    usdcBalance?: number;
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
        nickname: 'Ethereum Mainnet',
        ticker: 'ETH',
      },
    })
    .withNetworkEnabledMap({
      eip155: { [CHAIN_IDS.MAINNET]: true },
    })
    .withMetaMetricsOptIn()
    // Note: withTokensForAllPopularNetworks auto-generates balances for all tokens
    // Only include mUSD if hasMusdBalance is true, otherwise CTA won't show
    .withTokensForAllPopularNetworks([
      {
        address: toChecksumHexAddress(
          '0x0000000000000000000000000000000000000000',
        ),
        symbol: 'ETH',
        decimals: 18,
        name: 'Ethereum',
      },
      {
        address: toChecksumHexAddress(USDC_ADDRESS),
        symbol: 'USDC',
        decimals: USDC_DECIMALS,
        name: 'USDCoin',
      },
      // mUSD is conditionally added below based on hasMusdBalance option
      ...(options.hasMusdBalance
        ? [
            {
              address: toChecksumHexAddress(MUSD_ADDRESS),
              symbol: 'MUSD',
              decimals: MUSD_DECIMALS,
              name: 'MUSD',
            },
          ]
        : []),
    ])
    // Pre-populate token rates to avoid NaN values in UI
    .withTokenRates(
      CHAIN_IDS.MAINNET,
      toChecksumHexAddress('0x0000000000000000000000000000000000000000'),
      3000.0, // ETH price in USD
    )
    .withTokenRates(
      CHAIN_IDS.MAINNET,
      toChecksumHexAddress(USDC_ADDRESS),
      1.0, // USDC price in USD
    )
    .withTokenRates(
      CHAIN_IDS.MAINNET,
      toChecksumHexAddress(MUSD_ADDRESS),
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

  // Helper to get account address
  const getAccountAddress = () => {
    const accountsController =
      fixture.state.engine.backgroundState.AccountsController;
    const selectedAccountId =
      accountsController?.internalAccounts?.selectedAccount;
    const selectedAccount =
      accountsController?.internalAccounts?.accounts?.[selectedAccountId];
    return selectedAccount?.address;
  };

  // Helper to set token balance
  const setTokenBalance = (
    tokenAddress: string,
    decimals: number,
    balance: number,
  ) => {
    const accountAddress = getAccountAddress();
    if (!accountAddress) {
      throw new Error('Cannot set token balance: account address not found');
    }

    // Ensure tokenBalances structure exists
    if (!fixture.state.engine.backgroundState.TokenBalancesController) {
      merge(fixture.state.engine.backgroundState, {
        TokenBalancesController: { tokenBalances: {} },
      });
    }
    if (
      !fixture.state.engine.backgroundState.TokenBalancesController
        .tokenBalances
    ) {
      fixture.state.engine.backgroundState.TokenBalancesController.tokenBalances =
        {};
    }

    const chainIdKey = CHAIN_IDS.MAINNET;
    const tokenAddressKey = toChecksumHexAddress(tokenAddress);
    const balanceValue =
      '0x' + Math.floor(balance * 10 ** decimals).toString(16);

    if (
      !fixture.state.engine.backgroundState.TokenBalancesController
        .tokenBalances[accountAddress]
    ) {
      fixture.state.engine.backgroundState.TokenBalancesController.tokenBalances[
        accountAddress
      ] = {};
    }
    if (
      !fixture.state.engine.backgroundState.TokenBalancesController
        .tokenBalances[accountAddress][chainIdKey]
    ) {
      fixture.state.engine.backgroundState.TokenBalancesController.tokenBalances[
        accountAddress
      ][chainIdKey] = {};
    }

    fixture.state.engine.backgroundState.TokenBalancesController.tokenBalances[
      accountAddress
    ][chainIdKey][tokenAddressKey] = balanceValue;
  };

  // Set geolocation and ramp routing for mUSD eligibility (CRITICAL: Required for CTA visibility)
  // Without these, useMusdConversionEligibility and useRampTokens won't work
  fixture.state.fiatOrders.detectedGeolocation = 'US';
  fixture.state.fiatOrders.rampRoutingDecision = 'AGGREGATOR'; // Enables ramp token fetching

  // Add USDC balance (needed for conversion CTA to appear - canConvert condition)
  if (options.hasUsdcBalance !== false) {
    setTokenBalance(USDC_ADDRESS, USDC_DECIMALS, options.usdcBalance ?? 100);
  }

  // Add mUSD balance if requested
  if (options.hasMusdBalance) {
    setTokenBalance(MUSD_ADDRESS, MUSD_DECIMALS, options.musdBalance ?? 10);
  }

  return fixture;
};

const commonMockSetup = async (mockServer: Mockttp) => {
  // Feature flags for mUSD conversion
  // IMPORTANT: Version-gated flags require both 'enabled' and 'minimumVersion' properties
  // Without minimumVersion, validatedVersionGatedFeatureFlag returns undefined and falls back to local env var
  await setupRemoteFeatureFlagsMock(mockServer, {
    earnMusdConversionFlowEnabled: { enabled: true, minimumVersion: '0.0.0' },
    earnMusdCtaEnabled: { enabled: true, minimumVersion: '0.0.0' },
    earnMusdConversionTokenListItemCtaEnabled: {
      enabled: true,
      minimumVersion: '0.0.0',
    },
    earnMusdConversionAssetOverviewEnabled: {
      enabled: true,
      minimumVersion: '0.0.0',
    },
    earnMusdConversionConvertibleTokensAllowlist: { '*': ['USDC'] },
    earnMusdConversionMinAssetBalanceRequired: 0.01,
    // Set blocked countries to exclude US (our test geolocation)
    earnMusdConversionGeoBlockedCountries: { blockedRegions: ['GB'] },
  });

  // Geolocation mock - Required for mUSD CTA visibility (isGeoEligible check)
  // IMPORTANT: Must return plain text 'US', not JSON '"US"'
  // setupMockRequest always returns JSON, so we use direct mockttp API
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = getDecodedProxiedURL(request.url);
      return /on-ramp\.(dev-api|uat-api|api)\.cx\.metamask\.io\/geolocation/.test(
        url,
      );
    })
    .asPriority(998)
    .thenCallback(() => ({
      statusCode: 200,
      body: 'US', // Plain text, not JSON
      headers: { 'content-type': 'text/plain' },
    }));

  // Ramp tokens mock - Required for isMusdBuyableOnAnyChain check
  await setupMockRequest(mockServer, {
    url: /on-ramp-cache\.(uat-api|api)\.cx\.metamask\.io\/regions\/.*\/tokens/,
    response: {
      topTokens: [
        {
          assetId: 'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
          chainId: 'eip155:1',
          symbol: 'MUSD',
          name: 'MetaMask USD',
          decimals: 6,
          tokenSupported: true,
        },
      ],
      allTokens: [
        {
          assetId: 'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
          chainId: 'eip155:1',
          symbol: 'MUSD',
          name: 'MetaMask USD',
          decimals: 6,
          tokenSupported: true,
        },
        {
          assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          chainId: 'eip155:1',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          tokenSupported: true,
        },
      ],
    },
    requestMethod: 'GET',
    responseCode: 200,
  });

  // Price API mocks - Required to prevent $NaN values in UI
  // Mock v3/spot-prices (uses eip155:chainId/erc20:address format)
  await setupMockRequest(mockServer, {
    url: /price\.api\.cx\.metamask\.io\/v3\/spot-prices/,
    response: {
      'eip155:1/slip44:60': {
        id: 'ethereum',
        price: 0.999904095987313,
        marketCap: 120707177.900275,
        allTimeHigh: 1.6514207089624,
        allTimeLow: 0.000144565964182697,
        totalVolume: 9910501.61509202,
        high1d: 1.01396406829944,
        low1d: 0.972789150571307,
        circulatingSupply: 120694373.7963051,
        dilutedMarketCap: 120707177.900275,
        marketCapPercentChange1d: 2.69249,
        priceChange1d: 77.51,
        pricePercentChange1h: -0.8412978033401519,
        pricePercentChange1d: 2.656997542645518,
        pricePercentChange7d: 2.280904394391741,
        pricePercentChange14d: -9.26474467228875,
        pricePercentChange30d: 2.3819062900759485,
        pricePercentChange200d: 1.9842726591642341,
        pricePercentChange1y: -5.689801242350527,
      },
      'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
        id: 'usd-coin',
        price: 0.000333804977889164,
        marketCap: 23754743.4686059,
        allTimeHigh: 0.000390647532775852,
        allTimeLow: 0.000293034730938571,
        totalVolume: 4928178.91900057,
        high1d: 0.000333824677209193,
        low1d: 0.000333722507854467,
        circulatingSupply: 71166951334.28784,
        dilutedMarketCap: 23754727.3558976,
        marketCapPercentChange1d: -0.73791,
        priceChange1d: 0.00013626,
        pricePercentChange1h: 0.013840506207943954,
        pricePercentChange1d: 0.013630960582563337,
        pricePercentChange7d: -0.0009572939895655817,
        pricePercentChange14d: -0.00423420136358611,
        pricePercentChange30d: -0.000059529858641097485,
        pricePercentChange200d: -0.014687097277342517,
        pricePercentChange1y: -0.01926094991611645,
      },
      'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da': {
        id: 'metamask-usd',
        price: 0.000333694127478155,
        marketCap: 7677.36891681464,
        allTimeHigh: 0.000362267156463077,
        allTimeLow: 0.000309008208387742,
        totalVolume: 4392.14336541057,
        high1d: 0.00035425387373947,
        low1d: 0.000333370591188189,
        circulatingSupply: 22999586.214533,
        dilutedMarketCap: 7677.36891681464,
        marketCapPercentChange1d: -7.9584,
        priceChange1d: -0.000168554433610746,
        pricePercentChange1h: -0.04427332716520257,
        pricePercentChange1d: -0.01686233770769416,
        pricePercentChange7d: 0.07342340725992479,
        pricePercentChange14d: -0.09041741955087122,
        pricePercentChange30d: -0.10435457604221866,
        pricePercentChange200d: null,
        pricePercentChange1y: null,
      },
    },
    requestMethod: 'GET',
    responseCode: 200,
  });

  // Mock v2/chains/{chainId}/spot-prices (uses plain address format)
  await setupMockRequest(mockServer, {
    url: /price\.api\.cx\.metamask\.io\/v2\/chains\/\d+\/spot-prices/,
    response: {
      '0x0000000000000000000000000000000000000000': {
        id: 'ethereum',
        price: 3000.0,
        pricePercentChange1d: 2.65,
      },
      [USDC_ADDRESS.toLowerCase()]: {
        id: 'usd-coin',
        price: 1.0,
        pricePercentChange1d: 0.01,
      },
      [MUSD_ADDRESS.toLowerCase()]: {
        id: 'metamask-usd',
        price: 1.0,
        pricePercentChange1d: -0.01,
      },
    },
    requestMethod: 'GET',
    responseCode: 200,
  });

  // Mock v1/exchange-rates
  await setupMockRequest(mockServer, {
    url: /price\.api\.cx\.metamask\.io\/v1\/exchange-rates/,
    response: {
      btc: {
        name: 'Bitcoin',
        ticker: 'btc',
        value: 0.0000112264812935107,
        currencyType: 'crypto',
      },
      eth: {
        name: 'Ether',
        ticker: 'eth',
        value: 0.000333886780150301,
        currencyType: 'crypto',
      },
      usd: { name: 'US Dollar', ticker: 'usd', value: 1, currencyType: 'fiat' },
      eur: {
        name: 'Euro',
        ticker: 'eur',
        value: 0.837579007063758,
        currencyType: 'fiat',
      },
      gbp: {
        name: 'British Pound Sterling',
        ticker: 'gbp',
        value: 0.726810998426553,
        currencyType: 'fiat',
      },
    },
    requestMethod: 'GET',
    responseCode: 200,
  });

  // Mock v3/historical-prices (for price charts)
  await setupMockRequest(mockServer, {
    url: /price\.api\.cx\.metamask\.io\/v3\/historical-prices/,
    response: {
      prices: [
        [Date.now() - 86400000, 1.0],
        [Date.now() - 43200000, 1.0],
        [Date.now(), 1.0],
      ],
    },
    requestMethod: 'GET',
    responseCode: 200,
  });
};

describe(SmokeWalletPlatform('mUSD Conversion Happy Path'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.launchApp();
  });

  it.only('converts USDC to mUSD successfully (First Time User)', async () => {
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

        // Tap on the "Get mUSD" button inside the CTA
        // Note: The testID is on the container View, but we need to tap the Button inside
        const getMusdButton = Matchers.getElementByText('Get mUSD');
        await Gestures.tap(getMusdButton, {
          elemDescription: 'Get mUSD button',
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
