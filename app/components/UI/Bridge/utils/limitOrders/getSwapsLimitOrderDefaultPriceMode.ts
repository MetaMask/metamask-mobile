import { formatChainIdToHex } from '@metamask/bridge-controller';
import {
  isCaipChainId,
  KnownCaipNamespace,
  parseCaipChainId,
  type CaipChainId,
  type Hex,
} from '@metamask/utils';
import { LimitOrderExecutionType } from '../../constants/limitOrders';
import { getIsStablecoin } from '../../hooks/useStablecoinsDefaultSlippage';
import type { BridgeToken } from '../../types';

const getEvmHexChainId = (chainId: Hex | CaipChainId): Hex | undefined => {
  if (!isCaipChainId(chainId)) {
    return chainId;
  }

  return parseCaipChainId(chainId).namespace === KnownCaipNamespace.Eip155
    ? formatChainIdToHex(chainId)
    : undefined;
};

export const getIsSwapsLimitOrderStablecoin = (
  token: BridgeToken | undefined,
): boolean => {
  if (!token) {
    return false;
  }

  const hexChainId = getEvmHexChainId(token.chainId);

  return hexChainId ? getIsStablecoin(token.address, hexChainId) : false;
};

/**
 * Order side and price denomination a limit order pair starts on.
 *
 * A limit price is quoted per unit of the quoted token, expressed in the
 * counter token: the source token on a buy and the destination token on a
 * sell. A stablecoin is a meaningful unit to quote against, so whichever side
 * holds one becomes the counter token, and the price is then expressed as a
 * rate in it rather than in fiat:
 *
 * - neither token is a stablecoin: buy the destination token, priced in fiat
 * - only the source is a stablecoin: buy the destination token, priced in it
 * - only the destination is a stablecoin: sell the source token, priced in it
 * - both are stablecoins: buy the destination token, priced in the source one
 */
export const getSwapsLimitOrderDefaultPriceMode = ({
  destToken,
  sourceToken,
}: {
  destToken: BridgeToken | undefined;
  sourceToken: BridgeToken | undefined;
}): {
  executionType: LimitOrderExecutionType;
  isLimitFiatMode: boolean;
} => {
  const isSourceStablecoin = getIsSwapsLimitOrderStablecoin(sourceToken);
  const isDestStablecoin = getIsSwapsLimitOrderStablecoin(destToken);

  return {
    // Selling is only the better framing when the destination is the sole
    // stablecoin, which makes it the counter token; a stablecoin source is
    // already the counter token of a buy.
    executionType:
      isDestStablecoin && !isSourceStablecoin
        ? LimitOrderExecutionType.SELL
        : LimitOrderExecutionType.BUY,
    // Given the side above, the counter token is the stablecoin whenever the
    // pair has one, so a rate can replace the fiat price.
    isLimitFiatMode: !isSourceStablecoin && !isDestStablecoin,
  };
};
