import { FeatureId } from '@metamask/bridge-controller';
import type { BigNumber } from 'ethers';

import { useBridgeQuotes } from '../useBridgeQuotes';
import type { BridgeToken } from '../../types';

export const UNIFIED_QUOTE_WALLET_ADDRESS =
  '0x1234567890123456789012345678901234567890';

export const UNIFIED_QUOTE_ANALYTICS_CONTEXT = {
  stx_enabled: false,
  token_symbol_source: 'ETH',
  token_symbol_destination: 'USDC',
  token_security_type_destination: null,
  security_warnings: [],
  warnings: [],
  usd_amount_source: 0,
  feature_id: FeatureId.UNIFIED_SWAP_BRIDGE,
} as Parameters<typeof useBridgeQuotes>[0]['config']['analyticsContext'];

export const configFromBridgeState = (
  state: {
    bridge: {
      sourceAmount?: string;
      sourceToken?: BridgeToken;
      destToken?: BridgeToken;
      slippage?: string;
      destAddress?: string;
    };
  },
  options?: { latestSourceAtomicBalance?: BigNumber },
): Parameters<typeof useBridgeQuotes>[0]['config'] => ({
  srcTokenAmount: state.bridge.sourceAmount,
  sourceToken: state.bridge.sourceToken,
  destToken: state.bridge.destToken,
  slippage:
    state.bridge.slippage === undefined
      ? undefined
      : Number(state.bridge.slippage),
  walletAddress: UNIFIED_QUOTE_WALLET_ADDRESS,
  destWalletAddress: state.bridge.destAddress,
  analyticsContext: UNIFIED_QUOTE_ANALYTICS_CONTEXT,
  ...(options && 'latestSourceAtomicBalance' in options
    ? { latestSourceAtomicBalance: options.latestSourceAtomicBalance }
    : {}),
});

export const toLegacyQuoteDataResult = (
  result: ReturnType<typeof useBridgeQuotes>,
) => ({
  activeQuote: result.activeQuote,
  bestQuote: result.recommendedQuote,
  destTokenAmount: result.destTokenAmount,
  formattedQuoteData: result.formattedQuoteData
    ? {
        networkFee: result.formattedQuoteData.networkFee,
        estimatedTime: result.formattedQuoteData.estimatedTime,
        rate: result.formattedQuoteData.rate,
        priceImpact: result.formattedQuoteData.priceImpact,
        priceImpactFiat: result.formattedQuoteData.priceImpactFiat,
        slippage: result.formattedQuoteData.slippage,
      }
    : result.formattedQuoteData,
  isLoading: result.isLoading,
  quoteFetchError: result.quoteFetchError,
  isNoQuotesAvailable: result.isNoQuotesAvailable,
  isExpired: result.isExpired,
  needsNewQuote: result.needsNewQuote,
  shouldShowPriceImpactWarning: result.shouldShowPriceImpactWarning,
  willRefresh: result.isQuoteGoingToRefresh,
  blockaidError: result.blockaidError,
  quotesLoadingStatus: result.quotesLoadingStatus,
  validQuotes: result.sortedQuotes,
  isActiveQuoteForCurrentTokenPair: result.isActiveQuoteForCurrentTokenPair,
});
