import { useInsufficientBalanceAlert } from './alerts/useInsufficientBalanceAlert';

export function useIsInsufficientBalance() {
  return Boolean(
    useInsufficientBalanceAlert({ ignoreGasFeeToken: true }).length,
  );
}
