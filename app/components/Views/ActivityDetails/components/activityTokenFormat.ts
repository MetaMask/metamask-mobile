import {
  applyDisplaySign,
  getDisplaySignPrefix,
  getHumanReadableTokenAmount,
  type TokenAmount,
} from '../../../../util/activity-adapters';
import { strings } from '../../../../../locales/i18n';

/**
 * Formats a {@link TokenAmount} into a signed, symbol-suffixed display string
 * (e.g. `-1.5 ETH`, `+200 USDC`). Returns `undefined` when there is nothing to
 * show. `showPlus` controls whether incoming amounts get a leading `+`.
 */
export function formatActivityTokenAmount(
  token: TokenAmount | undefined,
  { showPlus = true }: { showPlus?: boolean } = {},
): string | undefined {
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

  const withSymbol = token.symbol ? `${human} ${token.symbol}` : human;
  return applyDisplaySign(
    withSymbol,
    getDisplaySignPrefix(token.direction, { showPlus }),
  );
}
