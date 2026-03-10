import { Mockttp } from 'mockttp';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { LocalNode, LocalNodeType } from '../../framework/types';
import { loginToApp } from '../../flows/wallet.flow';
import WalletView from '../../page-objects/wallet/WalletView';
import QuoteView from '../../page-objects/swaps/QuoteView';
import SwapTrendingTokensView from '../../page-objects/swaps/SwapTrendingTokensView';
import { Assertions } from '../../framework';
import CommonView from '../../page-objects/CommonView';
import TokenOverview from '../../page-objects/wallet/TokenOverview';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { prepareSwapsTestEnvironment } from '../../helpers/swap/prepareSwapsTestEnvironment';
import { testSpecificMock } from '../../helpers/swap/bridge-mocks';
import { GET_QUOTE_ETH_USDC_RESPONSE } from '../../helpers/swap/constants';
import { getDecodedProxiedURL } from '../notifications/utils/helpers';
import { SmokeTrade } from '../../tags';
import { AnvilPort } from '../../framework/fixtures/FixtureUtils';
import { AnvilManager } from '../../seeder/anvil-manager';
import enContent from '../../../locales/languages/en.json';
import { createRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { setupMockRequest } from '../../api-mocking/helpers/mockHelpers';

const BASE_CHAIN_ID_DECIMAL = '8453';

const ETHEREUM_TRENDING_ASSET_ID =
  'eip155:1/erc20:0x1111111111111111111111111111111111111111';
const BASE_TRENDING_ASSET_ID =
  'eip155:8453/erc20:0x2222222222222222222222222222222222222222';

const TRENDING_ALL_NETWORKS_RESPONSE = [
  {
    assetId: ETHEREUM_TRENDING_ASSET_ID,
    symbol: 'ETHX',
    name: 'Ethereum Trending',
    decimals: 18,
    price: '10',
    aggregatedUsdVolume: 2000000,
    marketCap: 100000000,
    priceChangePct: {
      h24: '0.2',
      h6: '0.1',
      h1: '0.01',
      m5: '0.001',
    },
  },
  {
    assetId: BASE_TRENDING_ASSET_ID,
    symbol: 'BASEX',
    name: 'Base Trending',
    decimals: 18,
    price: '8',
    aggregatedUsdVolume: 3000000,
    marketCap: 200000000,
    priceChangePct: {
      h24: '0.3',
      h6: '0.15',
      h1: '0.02',
      m5: '0.002',
    },
  },
];

const TRENDING_BASE_ONLY_RESPONSE = [TRENDING_ALL_NETWORKS_RESPONSE[1]];

const setupSwapsTrendingTokensMock = async (mockServer: Mockttp) => {
  const { response } = createRemoteFeatureFlagsMock({
    swapsTrendingTokens: true,
  });

  await setupMockRequest(
    mockServer,
    {
      requestMethod: 'GET',
      url: /client-config\.api\.cx\.metamask\.io\/v1\/flags/i,
      response,
      responseCode: 200,
    },
    1001,
  );
};

const setupTrendingTokensMock = async (mockServer: Mockttp) => {
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const decodedUrl = getDecodedProxiedURL(request.url);
      return /\/v3\/tokens\/trending/.test(decodedUrl);
    })
    .asPriority(1001)
    .thenCallback((request) => {
      const decodedUrl = getDecodedProxiedURL(request.url);
      const isBaseOnlyRequest = decodedUrl.includes(
        `chainIds=eip155:${BASE_CHAIN_ID_DECIMAL}`,
      );

      return {
        statusCode: 200,
        json: isBaseOnlyRequest
          ? TRENDING_BASE_ONLY_RESPONSE
          : TRENDING_ALL_NETWORKS_RESPONSE,
      };
    });
};

const setupQuoteFallbackMock = async (mockServer: Mockttp) => {
  await setupMockRequest(
    mockServer,
    {
      requestMethod: 'GET',
      url: /getQuote/i,
      response: GET_QUOTE_ETH_USDC_RESPONSE,
      responseCode: 200,
    },
    1000,
  );
};

const openSwapFromWalletActions = async () => {
  await loginToApp();
  await prepareSwapsTestEnvironment();
  await WalletView.tapWalletSwapButton();
};

const withBridgeFixtures = async (run: () => Promise<void>) => {
  await withFixtures(
    {
      fixture: ({ localNodes }: { localNodes?: LocalNode[] }) => {
        const node = localNodes?.[0] as unknown as AnvilManager;
        const rpcPort =
          node instanceof AnvilManager
            ? (node.getPort() ?? AnvilPort())
            : undefined;

        return new FixtureBuilder()
          .withNetworkController({
            chainId: '0x1',
            rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
            type: 'custom',
            nickname: 'Localhost',
            ticker: 'ETH',
          })
          .withDisabledSmartTransactions()
          .build();
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
      testSpecificMock: async (mockServer: Mockttp) => {
        await testSpecificMock(mockServer);
        await setupSwapsTrendingTokensMock(mockServer);
        await setupTrendingTokensMock(mockServer);
        await setupQuoteFallbackMock(mockServer);
      },
    },
    run,
  );
};

describe(SmokeTrade('Swap Trending Tokens (Bridge zero-state)'), () => {
  beforeEach(() => {
    jest.setTimeout(180000);
  });

  it('zero-state trending supports filters then row navigation', async () => {
    await withBridgeFixtures(async () => {
      await openSwapFromWalletActions();

      await SwapTrendingTokensView.expectSectionVisible();
      await SwapTrendingTokensView.expectNoInnerList();

      await SwapTrendingTokensView.scrollToFilters();

      await SwapTrendingTokensView.openPriceFilter();
      await SwapTrendingTokensView.expectPriceBottomSheetVisible();
      await Assertions.expectTextDisplayed(enContent.trending.high_to_low, {
        description: 'Default price change sort should be high to low',
      });
      await SwapTrendingTokensView.closeBottomSheet();

      await SwapTrendingTokensView.openTimeFilter();
      await SwapTrendingTokensView.expectTimeBottomSheetVisible();
      await SwapTrendingTokensView.selectTimeSixHours();

      await SwapTrendingTokensView.openNetworkFilter();
      await SwapTrendingTokensView.expectNetworkBottomSheetVisible();
      await SwapTrendingTokensView.selectNetworkByName('Base');

      await SwapTrendingTokensView.expectTokenRowVisible(
        BASE_TRENDING_ASSET_ID,
      );
      await SwapTrendingTokensView.expectTokenRowNotVisible(
        ETHEREUM_TRENDING_ASSET_ID,
      );

      await SwapTrendingTokensView.tapTokenRow(BASE_TRENDING_ASSET_ID);
      await Assertions.expectElementToBeVisible(TokenOverview.tokenPrice, {
        timeout: 10000,
        description: 'Token details should open from trending token row tap',
      });

      await CommonView.tapBackButton();
      await SwapTrendingTokensView.expectSectionVisible();

      await QuoteView.tapSourceAmountInput();
      await QuoteView.enterAmount('1');

      await SwapTrendingTokensView.expectSectionNotVisible();
    });
  });
});
