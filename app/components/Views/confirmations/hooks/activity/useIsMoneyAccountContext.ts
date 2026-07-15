import { useRoute } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';

/**
 * Returns true when the TransactionDetails screen was navigated to
 * from the Money Account tab (Routes.MONEY.TRANSACTION_DETAILS or
 * Routes.MONEY.CARD_TRANSACTION_DETAILS).
 */
export function useIsMoneyAccountContext(): boolean {
  const route = useRoute();
  return (
    route.name === Routes.MONEY.TRANSACTION_DETAILS ||
    route.name === Routes.MONEY.CARD_TRANSACTION_DETAILS
  );
}
