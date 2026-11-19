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

export interface QuoteParams {
  srcAmount?: string;
  srcToken?: BridgeToken;
  destToken?: BridgeToken;
  walletAddress?: string;
  destWalletAddress?: string;
  slippage?: string;
  gasIncluded?: boolean;
  gasIncluded7702?: boolean;
}

export const buildGenericQuoteRequest = (input: {
  quoteParams: QuoteParams;
  insufficientBalance: boolean;
  insufficientNativeReserveError: boolean;
  moneyAccountAddress?: string;
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
  const moneyAccountAddress = input.moneyAccountAddress;

  if (!walletAddress) {
    return;
  }

  const normalizedSourceAmount = normalizeSrcAmount(
    srcAmount,
    srcToken?.decimals,
  );

  const slippageNumber = slippage ? Number(slippage) : undefined;

  const insufficientBal = srcToken?.isMoneyToken
    ? true
    : insufficientBalance || insufficientNativeReserveError;

  return {
    srcChainId: srcToken?.chainId,
    srcTokenAddress: srcToken?.address,
    destChainId: destToken?.chainId,
    destTokenAddress: destToken?.address,
    srcTokenAmount: normalizedSourceAmount ?? '0',
    slippage: Number.isNaN(slippageNumber) ? undefined : slippageNumber,
    walletAddress:
      srcToken?.isMoneyToken && moneyAccountAddress
        ? moneyAccountAddress
        : walletAddress,
    destWalletAddress: destToken?.isMoneyToken
      ? moneyAccountAddress
      : (destWalletAddress ?? walletAddress),
    gasIncluded: Boolean(gasIncluded),
    gasIncluded7702: Boolean(gasIncluded7702),
    insufficientBal,
    isMoneyAccount: Boolean(srcToken?.isMoneyToken || destToken?.isMoneyToken),
  };
};
