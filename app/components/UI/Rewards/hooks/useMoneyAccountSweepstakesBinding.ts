import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';

export type MoneyAccountBindingEnsureResult =
  | 'bound'
  | 'conflict'
  | 'unavailable';

export interface UseMoneyAccountSweepstakesBindingResult {
  ensureBound: () => Promise<MoneyAccountBindingEnsureResult>;
  bindingConflict: boolean;
}

/**
 * Bind (or re-assert) the primary Money Account address to the active rewards
 * subscription via POST /wr/money-account/binding.
 *
 * - No address / subscription → `'unavailable'` (non-fatal; re-assert later).
 * - Network errors → `'unavailable'` (same; do not block campaign opt-in).
 * - 409 → `'conflict'` and sets `bindingConflict`.
 */
export function useMoneyAccountSweepstakesBinding(): UseMoneyAccountSweepstakesBindingResult {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const [bindingConflict, setBindingConflict] = useState(false);

  const ensureBound =
    useCallback(async (): Promise<MoneyAccountBindingEnsureResult> => {
      const moneyAccountAddress = primaryMoneyAccount?.address;
      if (!subscriptionId || !moneyAccountAddress) {
        return 'unavailable';
      }

      try {
        const result = (await Engine.controllerMessenger.call(
          'RewardsController:registerMoneyAccountBinding',
          moneyAccountAddress,
          subscriptionId,
        )) as 'bound' | 'conflict';

        if (result === 'conflict') {
          setBindingConflict(true);
          return 'conflict';
        }

        setBindingConflict(false);
        return 'bound';
      } catch {
        return 'unavailable';
      }
    }, [primaryMoneyAccount?.address, subscriptionId]);

  return {
    ensureBound,
    bindingConflict,
  };
}

export default useMoneyAccountSweepstakesBinding;
