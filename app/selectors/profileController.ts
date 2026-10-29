import type {
  ProfileControllerState,
  Profile,
  XProfile,
} from '@metamask/profile-controller';
import { parseCaipAccountId, type CaipAccountId } from '@metamask/utils';
import { createSelector } from 'reselect';
import type { RootState } from '../reducers';

/**
 * Returns the first EVM address among a profile's linked CAIP accounts.
 *
 * @param linkedAddresses - CAIP-10 account ids linked to the profile.
 * @returns The EVM address, or null when none is linked.
 */
export const getLinkedEvmAddress = (
  linkedAddresses: CaipAccountId[],
): string | null => {
  for (const linkedAddress of linkedAddresses) {
    try {
      const { address, chainId } = parseCaipAccountId(linkedAddress);
      if (chainId.startsWith('eip155:')) {
        return address;
      }
    } catch {
      // Ignore unsupported linked account formats.
    }
  }

  return null;
};

/** Gets the ProfileController state from engine.backgroundState. */
export const selectProfileControllerState = (
  state: RootState,
): ProfileControllerState | undefined =>
  state.engine.backgroundState.ProfileController;

export const selectProfileControllerProfile = createSelector(
  selectProfileControllerState,
  (state): Profile | undefined => {
    const profile = state?.profile;
    return profile?.profileId ? profile : undefined;
  },
);

/**
 * Gets the EVM wallet linked during social profile onboarding, or null.
 */
export const selectProfileControllerLinkedEvmAddress = createSelector(
  selectProfileControllerProfile,
  (profile): string | null =>
    profile ? getLinkedEvmAddress(profile.linkedAddresses) : null,
);

/**
 * Whether an existing social profile has disabled trading activity sharing.
 *
 * A missing profile is not private: callers use that state to preserve the
 * one-time Create profile prompt.
 */
export const selectIsProfileTradingActivityPrivate = createSelector(
  selectProfileControllerProfile,
  (profile): boolean => Boolean(profile?.tradingPrivacy === 'private'),
);

/**
 * Gets the linked X (Twitter) profile, or undefined when none is connected.
 */
export const selectProfileControllerXProfile = createSelector(
  selectProfileControllerState,
  (state): XProfile | undefined => state?.xProfile,
);

/**
 * Whether the user's profile is connected to X: a linked X profile exists in
 * state, or the current profile reports a live connection.
 */
export const selectIsConnectedToX = createSelector(
  [selectProfileControllerProfile, selectProfileControllerXProfile],
  (profile, xProfile): boolean =>
    Boolean(xProfile) || Boolean(profile?.connectedToX),
);
