import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { isMpcBackedMoneyAccount } from '../../../../lib/Money/mpc-money-account';

/**
 * Enable MPC-backed MFA for the primary Money Account.
 *
 * @returns The enable action, progress state, enabled state, and error.
 */
export function useEnableMoneyAccountMfa() {
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const isEnabled = isMpcBackedMoneyAccount(primaryMoneyAccount);
  const [isEnabling, setIsEnabling] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const enableMfa = useCallback(async () => {
    setIsEnabling(true);
    setError(undefined);
    try {
      await Engine.context.MoneyAccountMpcService.enableMfa();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to enable MFA');
      throw cause;
    } finally {
      setIsEnabling(false);
    }
  }, []);

  return { enableMfa, isEnabling, isEnabled, error };
}
