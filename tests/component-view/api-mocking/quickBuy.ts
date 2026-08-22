/**
 * Quick Buy HTTP mocks for component view tests.
 * Intercepts Token API v3 asset metadata used by useQuickBuySetup / useAssetMetadata.
 *
 * Quote fetching is Engine.context.BridgeController.fetchQuotes (allowed Engine
 * mock) — wire that in the test/renderer, not via jest.mock of quote hooks.
 */

// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock from 'nock';
import { disableNetConnect, teardownNock } from './nockHelpers';
import { USDC_DEST } from '../../../app/components/UI/Bridge/_mocks_/bridgeViewTestConstants';

const TOKEN_API_ORIGIN = 'https://tokens.api.cx.metamask.io';
const STATIC_ORIGIN = 'https://static.cx.metamask.io';

export const QUICK_BUY_USDC_ASSET_ID = `eip155:1/erc20:${USDC_DEST.address.toLowerCase()}`;

export const mockQuickBuyUsdcMetadata = {
  assetId: QUICK_BUY_USDC_ASSET_ID,
  symbol: USDC_DEST.symbol,
  name: USDC_DEST.name,
  decimals: USDC_DEST.decimals,
  address: USDC_DEST.address,
};

export function setupQuickBuyApiMock(): void {
  disableNetConnect();

  nock(TOKEN_API_ORIGIN)
    .persist()
    .get('/v3/assets')
    .query(true)
    .reply(200, [mockQuickBuyUsdcMetadata]);

  nock(STATIC_ORIGIN).persist().get(/.*/).reply(200, '');
}

export function clearQuickBuyApiMocks(): void {
  teardownNock();
}

/**
 * Pre-v2 quote shape returned by BridgeController.fetchQuotes. Echo
 * `srcTokenAmount` from the request so the CTA matching check passes.
 */
export function createQuickBuyFetchedQuote(srcTokenAmount: string) {
  return {
    quote: {
      requestId: 'quick-buy-quote-1',
      bridgeId: 'quick-buy-quote-1',
      bridges: ['provider-1'],
      steps: [],
      srcAsset: {
        address: '0x0000000000000000000000000000000000000000',
        chainId: 1,
        assetId: 'eip155:1/slip44:60',
        symbol: 'ETH',
        decimals: 18,
        name: 'Ethereum',
      },
      destAsset: {
        address: USDC_DEST.address,
        chainId: 1,
        assetId: QUICK_BUY_USDC_ASSET_ID,
        symbol: USDC_DEST.symbol,
        decimals: USDC_DEST.decimals,
        name: USDC_DEST.name,
      },
      feeData: {
        metabridge: {
          amount: '0',
          asset: {
            address: '0x0000000000000000000000000000000000000000',
            chainId: 1,
            assetId: 'eip155:1/slip44:60',
            symbol: 'ETH',
            decimals: 18,
            name: 'Ethereum',
          },
        },
      },
      srcChainId: 1,
      destChainId: 1,
      srcTokenAmount,
      destTokenAmount: '10000000',
      minDestTokenAmount: '9900000',
      gasIncluded: true,
    },
    estimatedProcessingTimeInSeconds: 30,
    trade: {
      chainId: 1,
      value: '0x0',
      data: '0x0',
      from: '0x0000000000000000000000000000000000000001',
      to: USDC_DEST.address,
      gasLimit: 100,
    },
  };
}
