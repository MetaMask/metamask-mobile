import { useSelector } from 'react-redux';
import { selectNetworkManagementEnabled } from '.';

/**
 * Hook to check if the Network Management feature is enabled.
 * Returns true if the feature is enabled AND the current version meets the minimum version requirement.
 */
export const useNetworkManagementEnabled = () => {
  const isNetworkManagementEnabled = useSelector(
    selectNetworkManagementEnabled,
  );

  return isNetworkManagementEnabled;
};
