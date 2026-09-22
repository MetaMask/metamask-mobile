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

export type QuoteParams = {
  srcAmount?: string;
  srcToken?: BridgeToken;
  destToken?: BridgeToken;
  walletAddress?: string;
  destWalletAddress?: string;
  slippage?: string;
  gasIncluded?: boolean;
  gasIncluded7702?: boolean;
};

export const buildGenericQuoteRequest = (input: {
  quoteParams: QuoteParams;
  insufficientBalance: boolean;
  insufficientNativeReserveError: boolean;
}): (Partial<GenericQuoteRequest> & { walletAddress: string }) | undefined => {
  const { quoteParams, insufficientBalance, insufficientNativeReserveError } =
    input;
  const {
    walletAddress,
    srcAmount,
    srcToken,
    destToken,
    destWalletAddress,
    slippage,
    gasIncluded,
    gasIncluded7702,
  } = quoteParams;

  if (!walletAddress) {
    return;
  }
  const normalizedSourceAmount = normalizeSrcAmount(
    srcAmount,
    srcToken?.decimals,
  );

  const slippageNumber = slippage ? Number(slippage) : undefined;

  const insufficientBal = insufficientBalance || insufficientNativeReserveError;

  return {
    srcChainId: srcToken?.chainId,
    srcTokenAddress: srcToken?.address,
    destChainId: destToken?.chainId,
    destTokenAddress: destToken?.address,
    srcTokenAmount: normalizedSourceAmount ?? '0',
    slippage: Number.isNaN(slippageNumber) ? undefined : slippageNumber,
    walletAddress,
    destWalletAddress: destWalletAddress ?? walletAddress,
    gasIncluded: Boolean(gasIncluded),
    gasIncluded7702: Boolean(gasIncluded7702),
    insufficientBal,
  };
};
