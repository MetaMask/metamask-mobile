import { useSelector } from 'react-redux';
import {
  selectCardholderAccounts,
  selectHasCardholderAccounts,
} from '../selectors/card';

/**
 * Simple hook for accessing card functionality in components
 * Only returns essential data - no error states or loading states as per requirements
 */
export const useCard = () => {
  const cardholderAccounts = useSelector(selectCardholderAccounts);
  const hasCardholderAccounts = useSelector(selectHasCardholderAccounts);

  // Helper function to check if specific account is cardholder
  const isAccountCardholder = (accountAddress: string) =>
    cardholderAccounts.includes(accountAddress.toLowerCase());

  return {
    // State
    cardholderAccounts,
    hasCardholderAccounts,

    // Helpers
    isAccountCardholder,
  };
};

export default useCard;
