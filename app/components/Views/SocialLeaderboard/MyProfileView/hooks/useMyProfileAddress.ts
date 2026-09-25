import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import type { MySocialProfile } from './useMyProfile';
import { resolveMyProfileAddress } from './resolveMyProfileAddress';

/**
 * TODO: replace with authenticated social `profileId` once GET /users/me exists.
 */
export const useMyProfileAddress = (
  profile: MySocialProfile | null,
): string | undefined => {
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  return resolveMyProfileAddress(
    profile?.linkedAccountAddress,
    selectedAddress,
  );
};
