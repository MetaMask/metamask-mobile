import { strings } from '../../../../../locales/i18n';
import { formatAmountWithLocaleSeparators } from '../../Bridge/utils/formatAmountWithLocaleSeparators';
import { formatSecondaryTokenAmount } from '../../Bridge/utils/sourceAmountInputMode';

export interface PostTradePairLabelParams {
  /** Source token amount in token units, as a decimal string. */
  sourceAmount?: string;
  sourceSymbol: string;
  /** Destination token amount in token units, as a decimal string. */
  destAmount?: string;
  destSymbol: string;
}

/**
 * Formats one trade amount the same way as the swap post-trade sheet:
 * truncated to 5 decimals, trailing zeros trimmed, locale grouping applied.
 * A missing amount returns an empty string.
 *
 * @param amount - Token amount as a decimal string, possibly in exponent form.
 * @returns The display amount, or an empty string when none was provided.
 */
const formatPairAmount = (amount: string | undefined): string => {
  if (!amount) {
    return '';
  }

  return formatAmountWithLocaleSeparators(
    formatSecondaryTokenAmount(amount) ?? amount,
  );
};

/**
 * Builds the `source → destination` pair label shown on the Social V1
 * post-trade share sheet. Uses the swap post-trade sheet's localized subtitle
 * and amount formatting so both sheets show the same decimals.
 *
 * @param params - Trade amounts and token symbols.
 * @returns The formatted pair label, trimmed of surrounding whitespace.
 */
export const formatPostTradePairLabel = ({
  sourceAmount,
  sourceSymbol,
  destAmount,
  destSymbol,
}: PostTradePairLabelParams): string => {
  const label = strings('bridge.post_trade_modal.trade_subtitle', {
    sourceAmount: formatPairAmount(sourceAmount),
    sourceSymbol,
    destAmount: formatPairAmount(destAmount),
    destSymbol,
  });

  // An empty amount leaves a double space beside the arrow; collapse it.
  return label.replace(/ {2,}/g, ' ').trim();
};
