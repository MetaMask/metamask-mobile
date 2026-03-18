import { useSelector } from 'react-redux';
import { selectAccountMenuEnabled } from '.';

/**
 * Hook to check if the account menu is enabled.
 * The account menu is permanently enabled.
 */
export const useAccountMenuEnabled = () => {
  const isAccountMenuEnabled = useSelector(selectAccountMenuEnabled);

  return isAccountMenuEnabled;
};
