import { useEffect } from 'react';
import Logger from '../../../../util/Logger';
import {
  useMoneyAccountDeposit,
  useMoneyAccountWithdrawal,
} from './useMoneyAccount';
import { setMoneyActionListener } from '../utils/moneyActionBus';

/**
 * Owns the deposit/withdrawal flows on behalf of the ephemeral surfaces that
 * trigger them (the "Add" / "Transfer" sheets). Mounted for the lifetime of the
 * Money tab, so the reject-then-navigate deferral inside `useConfirmNavigation`
 * survives those sheets closing. Surfaces hand off via `requestMoneyAction`.
 *
 * Returns nothing and renders nothing — call it from a long-lived Money screen.
 */
export function useMoneyActionExecutor(): void {
  const { initiateDeposit } = useMoneyAccountDeposit();
  const { initiateWithdrawal } = useMoneyAccountWithdrawal();

  useEffect(
    () =>
      setMoneyActionListener((action) => {
        const run =
          action.type === 'deposit'
            ? initiateDeposit(action.options)
            : initiateWithdrawal();
        // Errors are surfaced (toast/dev alert) inside the flows themselves;
        // swallow here so an unhandled rejection doesn't escape the listener.
        run.catch((error) =>
          Logger.error(error as Error, `[Money] ${action.type} action failed`),
        );
      }),
    [initiateDeposit, initiateWithdrawal],
  );
}
