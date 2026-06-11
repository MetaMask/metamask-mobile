import { useCallback } from 'react';
import { useMoneyAccountDeposit } from './useMoneyAccount';

export interface UseMoneyAccountAddRoutingResult {
  routeAddMoney: () => Promise<void>;
}

export const useMoneyAccountAddRouting =
  (): UseMoneyAccountAddRoutingResult => {
    const { initiateDeposit } = useMoneyAccountDeposit();

    const routeAddMoney = useCallback(
      () => initiateDeposit().catch(() => undefined),
      [initiateDeposit],
    );

    return {
      routeAddMoney,
    };
  };
