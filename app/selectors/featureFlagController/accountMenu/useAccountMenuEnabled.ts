import { useSelector } from 'react-redux';
import { selectAccountMenuEnabled } from '.';

/**
 * Hook to check if the Account Menu feature is enabled.
 * Returns true if the feature is enabled AND the current version meets the minimum version requirement.
 */
export const useAccountMenuEnabled = () => {
  const isAccountMenuEnabled = useSelector(selectAccountMenuEnabled);

  return isAccountMenuEnabled;
};
