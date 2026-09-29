import type { GenericQuoteRequest } from '@metamask/bridge-controller';
import { calcTokenValue } from '../../../../../util/transactions';
import type { BridgeToken } from '../../types';

const normalizeSrcAmount = (
  srcAmount: string | undefined,
  decimals: number | undefined,
): string => {
  if (!srcAmount || srcAmount === '.' || !decimals) {
    return '0';
  }
  return calcTokenValue(srcAmount, decimals).toFixed(0);
};

export const buildGenericQuoteRequest = (input: {
  quoteParams: {
    srcAmount?: string;
    srcToken?: BridgeToken;
    destToken?: BridgeToken;
    walletAddress?: string;
    destWalletAddress?: string;
    slippage?: string;
  };
  gasIncluded: boolean;
  gasIncluded7702: boolean;
  insufficientBalance: boolean;
  insufficientNativeReserveError: boolean;
}): GenericQuoteRequest | undefined => {
  const {
    quoteParams,
    gasIncluded,
    gasIncluded7702,
    insufficientBalance,
    insufficientNativeReserveError,
  } = input;
  const {
    walletAddress,
    srcAmount,
    srcToken,
    destToken,
    destWalletAddress,
    slippage,
  } = quoteParams;

  if (
    !walletAddress ||
    !srcToken ||
    srcAmount === undefined ||
    !destToken?.chainId
  ) {
    return;
  }
  const normalizedSourceAmount = normalizeSrcAmount(
    srcAmount,
    srcToken.decimals,
  );

  const slippageNumber = slippage ? Number(slippage) : undefined;

  const insufficientBal = insufficientBalance || insufficientNativeReserveError;

  return {
    srcChainId: srcToken.chainId,
    srcTokenAddress: srcToken.address,
    destChainId: destToken.chainId,
    destTokenAddress: destToken.address,
    srcTokenAmount: normalizedSourceAmount,
    slippage: Number.isNaN(slippageNumber) ? undefined : slippageNumber,
    walletAddress,
    destWalletAddress: destWalletAddress ?? walletAddress,
    gasIncluded,
    gasIncluded7702,
    insufficientBal,
  };
};
