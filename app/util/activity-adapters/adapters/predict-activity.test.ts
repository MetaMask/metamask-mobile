import type { CaipChainId } from '@metamask/utils';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { PredictActivity } from '../../../components/UI/Predict/types';
import { mapPredictActivity } from './predict-activity';

const POLYGON: CaipChainId = 'eip155:137';
const USDC_ASSET_ID =
  'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174';
const QUOTE = { symbol: 'USDC', assetId: USDC_ASSET_ID };

const baseBuy: PredictActivity = {
  id: 'activity-1',
  providerId: 'polymarket',
  title: 'Will it rain tomorrow?',
  outcome: 'Yes',
  entry: {
    type: 'buy',
    timestamp: 1_700_000_000, // Unix seconds
    marketId: 'market-1',
    outcomeId: 'outcome-1',
    outcomeTokenId: 1,
    amount: 100,
    price: 0.42,
  },
};

const baseSell: PredictActivity = {
  ...baseBuy,
  id: 'activity-2',
  entry: {
    type: 'sell',
    timestamp: 1_700_000_100, // Unix seconds
    marketId: 'market-1',
    outcomeId: 'outcome-1',
    outcomeTokenId: 1,
    amount: 75,
    price: 0.6,
  },
};

const baseClaim: PredictActivity = {
  ...baseBuy,
  id: 'activity-3',
  entry: {
    type: 'claimWinnings',
    timestamp: 1_700_000_200, // Unix seconds
    amount: 250,
  },
};

describe('mapPredictActivity', () => {
  it('maps a buy entry to predictionPlaced with out-direction token', () => {
    expect(
      mapPredictActivity({
        activity: baseBuy,
        chainId: POLYGON,
        quoteAsset: QUOTE,
      }),
    ).toEqual({
      type: 'predictionPlaced',
      chainId: POLYGON,
      status: 'success',
      timestamp: 1_700_000_000_000,
      hash: 'activity-1',
      raw: { type: 'predictActivity', data: baseBuy },
      data: {
        token: {
          amount: '100',
          symbol: 'USDC',
          assetId: USDC_ASSET_ID,
          direction: 'out',
        },
      },
    });
  });

  it('maps a sell entry to predictionCashedOut with in-direction token', () => {
    expect(
      mapPredictActivity({
        activity: baseSell,
        chainId: POLYGON,
        quoteAsset: QUOTE,
      }),
    ).toEqual({
      type: 'predictionCashedOut',
      chainId: POLYGON,
      status: 'success',
      timestamp: 1_700_000_100_000,
      hash: 'activity-2',
      raw: { type: 'predictActivity', data: baseSell },
      data: {
        token: {
          amount: '75',
          symbol: 'USDC',
          assetId: USDC_ASSET_ID,
          direction: 'in',
        },
      },
    });
  });

  it('maps a claimWinnings entry to predictionClaimWinnings with in-direction token', () => {
    expect(
      mapPredictActivity({
        activity: baseClaim,
        chainId: POLYGON,
        quoteAsset: QUOTE,
      }),
    ).toEqual({
      type: 'predictionClaimWinnings',
      chainId: POLYGON,
      status: 'success',
      timestamp: 1_700_000_200_000,
      hash: 'activity-3',
      raw: { type: 'predictActivity', data: baseClaim },
      data: {
        token: {
          amount: '250',
          symbol: 'USDC',
          assetId: USDC_ASSET_ID,
          direction: 'in',
        },
      },
    });
  });

  it('omits assetId when quoteAsset.assetId is not provided', () => {
    const result = mapPredictActivity({
      activity: baseBuy,
      chainId: POLYGON,
      quoteAsset: { symbol: 'USDC' },
    });

    expect(
      result && 'token' in result.data ? result.data.token : undefined,
    ).toEqual({
      amount: '100',
      symbol: 'USDC',
      assetId: undefined,
      direction: 'out',
    });
  });

  it('passes the caller-supplied chainId through unchanged', () => {
    const customChain: CaipChainId = 'eip155:8453';
    const result = mapPredictActivity({
      activity: baseBuy,
      chainId: customChain,
      quoteAsset: QUOTE,
    });

    expect(result?.chainId).toBe(customChain);
  });

  it('returns null for an unknown entry type rather than throwing', () => {
    const unknown = {
      ...baseBuy,
      id: 'activity-x',
      entry: { type: 'mystery', timestamp: 1 },
    } as unknown as PredictActivity;

    expect(
      mapPredictActivity({
        activity: unknown,
        chainId: POLYGON,
        quoteAsset: QUOTE,
      }),
    ).toBeNull();
  });
});
