import type { Hex } from '@metamask/utils';
import { strings } from '../../../../../locales/i18n';
import { selectTransactionMetadataById } from '../../../../selectors/transactionController';
import { selectSingleTokenByAddressAndChainId } from '../../../../selectors/tokensController';
import { selectTickerByChainId } from '../../../../selectors/networkController';
import { formatPrice } from './format';
import type { RootState } from '../../../../reducers';

interface WithdrawConfirmedMessage {
  title: string;
  description: string;
}

/**
 * Derives the withdraw-confirmed toast message from transaction metadata.
 *
 * For post-quote withdrawals with valid metamaskPay data, displays the
 * resolved token symbol and targetFiat amount. Otherwise falls back to the
 * original USDC-only message.
 */
export function getWithdrawConfirmedMessage(
  state: RootState,
  transactionId: string | undefined,
  fallbackAmount: number,
): WithdrawConfirmedMessage {
  const title = strings('predict.withdraw.withdraw_completed');

  const txMeta = transactionId
    ? selectTransactionMetadataById(state, transactionId)
    : undefined;
  const { metamaskPay } = txMeta ?? {};

  if (!metamaskPay?.isPostQuote) {
    return {
      title,
      description: strings('predict.withdraw.withdraw_completed_subtitle', {
        amount: formatPrice(fallbackAmount),
      }),
    };
  }

  const targetFiat = Number(metamaskPay.targetFiat);
  const withdrawAmount =
    Number.isFinite(targetFiat) && targetFiat > 0 ? targetFiat : fallbackAmount;

  const chainId = metamaskPay.chainId as Hex;
  const tokenAddress = metamaskPay.tokenAddress as Hex;
  const tokenSymbol =
    selectSingleTokenByAddressAndChainId(state, tokenAddress, chainId)
      ?.symbol ??
    selectTickerByChainId(state, chainId) ??
    'USDC';

  return {
    title,
    description: strings(
      'predict.withdraw.withdraw_any_token_completed_subtitle',
      { amount: formatPrice(withdrawAmount), token: tokenSymbol },
    ),
  };
}
