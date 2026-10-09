import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import type { RootState } from '../../../reducers';
import { selectBalanceByAccountGroup } from '../../../selectors/assets/balances';
import { selectAllAccountGroupIconSeedAddresses } from '../../../selectors/multichainAccounts/accounts';
import { selectPrivacyMode } from '../../../selectors/preferencesController';
import { formatWithThreshold } from '../../../util/assets';
import I18n from '../../../../locales/i18n';

/**
 * Icon seed for an account group, read from the shared address map.
 *
 * @param accountGroupId - Account group whose avatar seed is needed.
 * @returns The seed address, or an empty string when the group has none.
 */
export const useAccountGroupIconSeedAddress = (
  accountGroupId: string,
): string =>
  useSelector(
    (state: RootState) =>
      selectAllAccountGroupIconSeedAddresses(state)[accountGroupId] ?? '',
  );

interface AccountGroupBalance {
  /** Formatted fiat amount. Blank when the balance is zero or not loaded. */
  balanceLabel: string | undefined;
  /** True when privacy mode should mask a shown balance. */
  isBalanceHidden: boolean;
}

/**
 * Fiat balance for an account group.
 *
 * Zero stays blank because `selectBalanceByAccountGroup` synthesizes 0 before
 * assets load, so "$0.00" would read as a real empty wallet.
 *
 * @param accountGroupId - Account group whose balance is shown.
 * @returns The formatted label and whether privacy mode hides it.
 */
export const useAccountGroupBalance = (
  accountGroupId: string,
): AccountGroupBalance => {
  const selectBalanceForGroup = useMemo(
    () => selectBalanceByAccountGroup(accountGroupId),
    [accountGroupId],
  );
  const groupBalance = useSelector(selectBalanceForGroup);
  const totalBalance = groupBalance?.totalBalanceInUserCurrency;
  const userCurrency = groupBalance?.userCurrency;
  const privacyMode = useSelector(selectPrivacyMode);

  const balanceLabel = useMemo(() => {
    if (!totalBalance || !userCurrency) {
      return undefined;
    }
    return formatWithThreshold(totalBalance, 0.01, I18n.locale, {
      style: 'currency',
      currency: userCurrency.toUpperCase(),
    });
  }, [totalBalance, userCurrency]);

  return {
    balanceLabel,
    isBalanceHidden: privacyMode && Boolean(balanceLabel),
  };
};
