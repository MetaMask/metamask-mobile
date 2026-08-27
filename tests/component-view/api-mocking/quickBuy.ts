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

const QUICK_BUY_ETH_ASSET = {
  address: '0x0000000000000000000000000000000000000000',
  chainId: 1,
  assetId: 'eip155:1/slip44:60',
  symbol: 'ETH',
  decimals: 18,
  name: 'Ethereum',
};

/** 0.001 ETH. At the deterministic $2000/ETH rate this is a $2 network fee. */
export const QUICK_BUY_QUOTE_TX_FEE_AMOUNT = '1000000000000000';

/**
 * Fiat total shown after selecting the $10 buy pill with this fixture
 * ($10 entered + $2 network fee from {@link QUICK_BUY_QUOTE_TX_FEE_AMOUNT}).
 */
export const QUICK_BUY_QUOTE_TOTAL_FOR_10_USD = '$12.00';

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
 *
 * `network` / `relayer` / `txFee` are required for `networkFeeFiat` after
 * quote enrichment. Gas-included quotes read `txFee`; non-gasless quotes
 * read `network` + `relayer`. Without them the total stays a formatted zero.
 */
export function createQuickBuyFetchedQuote(srcTokenAmount: string) {
  return {
    quote: {
      requestId: 'quick-buy-quote-1',
      bridgeId: 'quick-buy-quote-1',
      bridges: ['provider-1'],
      steps: [],
      srcAsset: QUICK_BUY_ETH_ASSET,
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
          asset: QUICK_BUY_ETH_ASSET,
        },
        network: {
          amount: QUICK_BUY_QUOTE_TX_FEE_AMOUNT,
          asset: QUICK_BUY_ETH_ASSET,
        },
        relayer: {
          amount: '0',
          asset: QUICK_BUY_ETH_ASSET,
        },
        txFee: {
          amount: QUICK_BUY_QUOTE_TX_FEE_AMOUNT,
          asset: QUICK_BUY_ETH_ASSET,
          maxFeePerGas: '4667609171',
          maxPriorityFeePerGas: '1000000004',
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
