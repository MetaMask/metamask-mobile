import {
  getDefaultAssetsControllerState,
  PriceDataSource,
  type AssetsControllerState,
  type Caip19AssetId,
  type ChainId,
  type DataRequest,
} from '@metamask/assets-controller';
import type { ApiPlatformClient } from '@metamask/core-backend';

const ACCOUNT_ID = 'account-id';
const MAINNET_CHAIN_ID = 'eip155:1' as ChainId;
const UNSUPPORTED_CHAIN_ID = 'eip155:999999' as ChainId;
const MAINNET_ETH_ASSET_ID =
  'eip155:1/slip44:60' as Caip19AssetId;
const UNSUPPORTED_NATIVE_ASSET_ID =
  'eip155:999999/slip44:60' as Caip19AssetId;

describe('AssetsController native asset pricing', () => {
  it('prices Mainnet ETH when an unsupported network is present', async () => {
    const state: AssetsControllerState = {
      ...getDefaultAssetsControllerState(),
      assetsBalance: {
        [ACCOUNT_ID]: {
          [MAINNET_ETH_ASSET_ID]: { amount: '1' },
          [UNSUPPORTED_NATIVE_ASSET_ID]: { amount: '1' },
        },
      },
    };
    const fetchPriceV2SupportedNetworks = jest.fn().mockResolvedValue({
      fullSupport: [MAINNET_CHAIN_ID],
      partialSupport: [],
    });
    const fetchV3SpotPrices = jest.fn().mockResolvedValue({
      [MAINNET_ETH_ASSET_ID]: {
        id: MAINNET_ETH_ASSET_ID,
        price: 2_000,
      },
    });
    const queryApiClient = {
      prices: {
        fetchPriceV2SupportedNetworks,
        fetchV3SpotPrices,
      },
    } as unknown as ApiPlatformClient;
    const priceDataSource = new PriceDataSource({
      queryApiClient,
      getSelectedCurrency: () => 'usd',
      getAssetsState: () => state,
    });
    const request: DataRequest = {
      accountsWithSupportedChains: [],
      chainIds: [MAINNET_CHAIN_ID, UNSUPPORTED_CHAIN_ID],
      dataTypes: ['price'],
    };

    const result = await priceDataSource.fetch(request);

    expect(fetchV3SpotPrices).toHaveBeenCalledWith(
      [MAINNET_ETH_ASSET_ID],
      {
        currency: 'usd',
        includeMarketData: true,
      },
    );
    expect(result.assetsPrice?.[MAINNET_ETH_ASSET_ID]).toEqual(
      expect.objectContaining({
        assetPriceType: 'fungible',
        price: 2_000,
        usdPrice: 2_000,
      }),
    );
    expect(result.assetsPrice?.[UNSUPPORTED_NATIVE_ASSET_ID]).toBeUndefined();
  });
});
