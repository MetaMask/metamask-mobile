import { formatAddressToCaipReference } from '@metamask/bridge-controller';

import type { BridgeToken } from '../types';
import { getDecimalChainId } from '../../../../util/networks';

const formatSlippageForQuoteRequest = (slippage?: string) => {
  const slippageNumber = slippage ? Number(slippage) : undefined;
  return Number.isNaN(slippageNumber) ? undefined : slippageNumber;
};

/**
 * Builds a quote request from source/dest tokens and an atomic source amount.
 * Gas and balance fields are included only when provided (unified quotes).
 *
 * @returns Params for `updateBridgeQuoteRequestParams`
 */
export const buildQuoteRequest = ({
  sourceToken,
  destToken,
  srcTokenAmount,
  walletAddress,
  destWalletAddress,
  slippage,
  gasIncluded,
  gasIncluded7702,
  insufficientBal,
}: {
  sourceToken: Pick<BridgeToken, 'address' | 'chainId'>;
  destToken: Pick<BridgeToken, 'address' | 'chainId'>;
  srcTokenAmount: string;
  walletAddress: string;
  destWalletAddress?: string;
  slippage?: string;
  gasIncluded?: boolean;
  gasIncluded7702?: boolean;
  insufficientBal?: boolean;
}) => {
  const includeGasAndBalance =
    gasIncluded !== undefined ||
    gasIncluded7702 !== undefined ||
    insufficientBal !== undefined;

  return {
    srcChainId: getDecimalChainId(sourceToken.chainId),
    srcTokenAddress: formatAddressToCaipReference(sourceToken.address),
    destChainId: getDecimalChainId(destToken.chainId),
    destTokenAddress: formatAddressToCaipReference(destToken.address),
    srcTokenAmount,
    slippage: formatSlippageForQuoteRequest(slippage),
    walletAddress,
    destWalletAddress: destWalletAddress ?? walletAddress,
    // The backend decides what kind of quote to return, so gasIncluded
    // and gasIncluded7702 values are ignored. No need to include them.
    ...(includeGasAndBalance
      ? {
          gasIncluded,
          gasIncluded7702,
          insufficientBal,
        }
      : {}),
  };
};
