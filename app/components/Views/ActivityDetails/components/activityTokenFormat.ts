import { useCallback } from 'react';
import {
  applyDisplaySign,
  getDisplaySignPrefix,
  getHumanReadableTokenAmount,
  type TokenAmount,
} from '../../../../util/activity-adapters';
import { useFormatters } from '../../../hooks/useFormatters';
import { strings } from '../../../../../locales/i18n';

/**
 * Returns a formatter that turns a {@link TokenAmount} into a signed,
 * symbol-suffixed display string (e.g. `-1.5 ETH`, `+200 USDC`), localized to the
 * user's language. Yields `undefined` when there is nothing to show. `showPlus`
 * controls whether incoming amounts get a leading `+`.
 */
export function useFormatActivityTokenAmount() {
  const { formatTokenAmount } = useFormatters();

  return useCallback(
    (
      token: TokenAmount | undefined,
      { showPlus = true }: { showPlus?: boolean } = {},
    ): string | undefined => {
      if (!token) {
        return undefined;
      }

      if (token.isUnlimitedApproval) {
        return strings('confirm.unlimited');
      }

      const human = getHumanReadableTokenAmount(token);
      if (human === undefined) {
        return token.symbol;
      }

      const withSymbol = formatTokenAmount(
        human as `${number}`,
        token.symbol ?? '',
      ).trimEnd();

      return applyDisplaySign(
        withSymbol,
        getDisplaySignPrefix(token.direction, { showPlus }),
      );
    },
    [formatTokenAmount],
  );
}
