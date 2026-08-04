import { createFormatters } from '@metamask/client-utils';

import { getLocaleLanguageCode } from '../../components/hooks/useFormatters';
import { selectBalanceBySelectedAccountGroup } from '../../selectors/assets/balances';
import { selectSelectedAccountGroup } from '../../selectors/multichainAccounts/accountTreeController';
import type { RootState } from '../../reducers';

/**
 * `selectBalanceBySelectedAccountGroup` is a selector *factory* — each call
 * builds a fresh `createSelector` instance. It must be instantiated once and
 * reused, otherwise every read re-runs the (expensive) all-wallets balance
 * aggregation from scratch and re-triggers Reselect's dev-only warnings.
 */
const selectBalance = selectBalanceBySelectedAccountGroup();

/**
 * The selected account group's total balance, formatted in the user's
 * currency and locale.
 *
 * Shared by `WidgetUpdaterService` (home screen widget) and
 * `BalanceLiveActivityService` (Lock Screen / Dynamic Island) so the two
 * surfaces can never drift apart on rounding, currency or locale. Privacy mode
 * is deliberately NOT handled here: the widget masks the value while the Live
 * Activity suppresses itself entirely, so each caller decides.
 */
export function formatSelectedAccountGroupBalance(state: RootState): string {
  const balance = selectBalance(state);

  return createFormatters({ locale: getLocaleLanguageCode() }).formatCurrency(
    balance?.totalBalanceInUserCurrency ?? 0,
    balance?.userCurrency ?? 'usd',
  );
}

/** The selected account group's display name, e.g. "Account 1". */
export function getSelectedAccountGroupName(
  state: RootState,
): string | undefined {
  return selectSelectedAccountGroup(state)?.metadata?.name;
}
