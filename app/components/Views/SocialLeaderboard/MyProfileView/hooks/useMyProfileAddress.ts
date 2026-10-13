import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { useSessionProfileId } from '../../../../../util/notifications/hooks/useSessionProfileId';
import type { MySocialProfile } from './useMyProfile';
import { resolveMyProfileAddress } from './resolveMyProfileAddress';

/**
 * Wallet or session id used for owner trader endpoints.
 * Waits for the session profile query so we do not fetch by wallet and then
 * again by profileId.
 */
export const useMyProfileAddress = (
  profile: MySocialProfile | null,
): string | undefined => {
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const { profileId: sessionProfileId, isLoading } = useSessionProfileId();

  if (isLoading) {
    return undefined;
  }

  return resolveMyProfileAddress(
    sessionProfileId,
    profile?.linkedAccountAddress,
    selectedAddress,
  );
};
