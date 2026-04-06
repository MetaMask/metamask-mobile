import { selectTransactionMetadataById } from '../../../../selectors/transactionController';
import { selectSingleTokenByAddressAndChainId } from '../../../../selectors/tokensController';
import { selectTickerByChainId } from '../../../../selectors/networkController';
import type { RootState } from '../../../../reducers';
import type { Hex } from '@metamask/utils';

export interface WithdrawTokenInfo {
  isPostQuote: boolean;
  targetFiat: number | undefined;
  tokenSymbol: string;
}

/**
 * Resolves token symbol and amount from a post-quote withdrawal transaction.
 * Shared by both Predict and Perps withdraw toast hooks.
 *
 * Lookup chain: tokenAddress+chainId → ticker → 'USDC' fallback.
 */
export function resolveWithdrawTokenInfo(
  state: RootState,
  transactionId: string | undefined,
): WithdrawTokenInfo {
  const txMeta = transactionId
    ? selectTransactionMetadataById(state, transactionId)
    : undefined;
  const { metamaskPay } = txMeta ?? {};

  if (!metamaskPay?.isPostQuote) {
    return { isPostQuote: false, targetFiat: undefined, tokenSymbol: 'USDC' };
  }

  const rawFiat = Number(metamaskPay.targetFiat);
  const targetFiat =
    Number.isFinite(rawFiat) && rawFiat > 0 ? rawFiat : undefined;

  const chainId = metamaskPay.chainId as Hex | undefined;
  const tokenAddress = metamaskPay.tokenAddress as Hex | undefined;

  let tokenSymbol: string | undefined;
  if (tokenAddress && chainId) {
    tokenSymbol = selectSingleTokenByAddressAndChainId(
      state,
      tokenAddress,
      chainId,
    )?.symbol;
  }
  if (!tokenSymbol && chainId) {
    tokenSymbol = selectTickerByChainId(state, chainId);
  }
  if (!tokenSymbol) {
    tokenSymbol = 'USDC';
  }

  return { isPostQuote: true, targetFiat, tokenSymbol };
}
