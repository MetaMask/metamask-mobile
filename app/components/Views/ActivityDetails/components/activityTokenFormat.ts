import { useCallback } from 'react';
import { BigNumber } from 'bignumber.js';
import {
  applyDisplaySign,
  formatTokenDisplayAmount,
  getDisplaySignPrefix,
  getHumanReadableTokenAmount,
  isSpendingCapUnlimited,
  type TokenAmount,
} from '../../../../util/activity-adapters';
import { formatSubscriptNotation } from '../../../../util/number/subscriptNotation';
import { useFormatters } from '../../../hooks/useFormatters';
import { strings } from '../../../../../locales/i18n';

/**
 * Returns a formatter that turns a {@link TokenAmount} into a signed,
 * symbol-suffixed display string (e.g. `-1.5 ETH`, `+200 USDC`), localized to the
 * user's language. Yields `undefined` when there is nothing to show. `showPlus`
 * controls whether incoming amounts get a leading `+`, `signZero` whether a
 * zero amount keeps its sign (e.g. `-0 ETH`), and `useSubscriptNotation`
 * whether the leading zeros of a tiny amount are condensed (e.g.
 * `-0.0₇1234 ETH` rather than `-<0.00001 ETH`).
 */
export function useFormatActivityTokenAmount() {
  const formatters = useFormatters();

  return useCallback(
    (
      token: TokenAmount | undefined,
      {
        showPlus = true,
        signZero = true,
        useSubscriptNotation = false,
      }: {
        showPlus?: boolean;
        signZero?: boolean;
        useSubscriptNotation?: boolean;
      } = {},
    ): string | undefined => {
      if (!token) {
        return undefined;
      }

      if (isSpendingCapUnlimited(token.amount, token.decimals)) {
        return strings('confirm.unlimited');
      }

      const human = getHumanReadableTokenAmount(token);
      if (human === undefined) {
        return token.symbol;
      }

      const subscript = useSubscriptNotation
        ? formatSubscriptNotation(Number(human))
        : null;
      const display = subscript
        ? `${subscript} ${token.symbol ?? ''}`.trimEnd()
        : formatTokenDisplayAmount(formatters, human, token.symbol);
      if (!signZero && new BigNumber(human).isZero()) {
        return display;
      }

      return applyDisplaySign(
        display,
        getDisplaySignPrefix(token.direction, { showPlus }),
      );
    },
    [formatters],
  );
}
