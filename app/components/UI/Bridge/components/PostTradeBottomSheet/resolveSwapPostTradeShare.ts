import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { isUnsupportedPostTradeAsset } from '../../../../Views/SocialLeaderboard/PostTradeShareBottomSheet/quoteTokens';
import {
  isSpotPostTradeShareEligible,
  type PostTradePrompt,
} from '../../../../Views/SocialLeaderboard/PostTradeShareBottomSheet/resolvePostTradePrompt';
import { caipChainIdToTradeInFlightChain } from '../../../SocialFeed/utils/chainMapping';
import { formatCurrency } from '../../utils/currencyUtils';
import type { BridgeToken } from '../../types';
import type { SwapSocialPostTrade } from './PostTradeBottomSheet.types';

export interface ResolveSwapSocialPostTradeParams {
  /** Result of `resolvePostTradePrompt('swaps')` at submit time. */
  prompt: PostTradePrompt;
  sourceToken?: BridgeToken;
  destToken?: BridgeToken;
  /** USD value of the sold amount, from `quote.src.usd`. */
  sourceUsd?: string;
}

/**
 * Quote assets are natives and stables. Social-api does not build positions
 * for them, so they cannot be the token a post is about.
 */
const isQuoteAsset = (token: BridgeToken): boolean =>
  isUnsupportedPostTradeAsset(
    token.address,
    formatChainIdToCaip(token.chainId),
  );

const toShareTarget = (
  token: BridgeToken,
  side: 'buy' | 'sell',
  txHash: SwapSocialPostTrade['txHash'],
) => {
  const tradeInFlightChain = caipChainIdToTradeInFlightChain(
    formatChainIdToCaip(token.chainId),
  );
  return tradeInFlightChain
    ? { token, side, txHash, tradeInFlightChain }
    : undefined;
};

/**
 * Returns the social share context for a normal swap, or `undefined` when the
 * sheet must not offer Create post.
 *
 * The position is the non-quote side. A received non-quote token is a buy and
 * a sold non-quote token is a sell. Quote-to-quote swaps have no position.
 * Chain support is checked on the position token only. If the position is on
 * an unsupported chain, the result is `undefined` and the other side is not
 * tried.
 */
export const resolveSwapSocialPostTrade = ({
  prompt,
  sourceToken,
  destToken,
  sourceUsd,
}: ResolveSwapSocialPostTradeParams): SwapSocialPostTrade | undefined => {
  if (prompt.kind !== 'share_sheet' || !sourceToken || !destToken) {
    return undefined;
  }
  if (!isSpotPostTradeShareEligible(Number(sourceUsd))) {
    return undefined;
  }

  const isCrossChain =
    formatChainIdToCaip(sourceToken.chainId) !==
    formatChainIdToCaip(destToken.chainId);

  const target = !isQuoteAsset(destToken)
    ? toShareTarget(
        destToken,
        'buy',
        isCrossChain ? 'destination' : 'submitted',
      )
    : !isQuoteAsset(sourceToken)
      ? toShareTarget(sourceToken, 'sell', 'submitted')
      : undefined;
  if (!target) {
    return undefined;
  }

  return {
    countKey: prompt.countKey,
    tradeInFlightChain: target.tradeInFlightChain,
    txHash: target.txHash,
    preview: {
      tokenSymbol: target.token.symbol,
      tokenAddress: target.token.address,
      chain: target.tradeInFlightChain,
      side: target.side,
      costLabel: formatCurrency(Number(sourceUsd), 'USD'),
    },
  };
};
