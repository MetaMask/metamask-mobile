import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  type Position,
} from '@metamask/perps-controller';
import type { Position as SocialPosition } from '@metamask/social-controllers';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import Engine from '../../../../core/Engine';
import { areAddressesEqual } from '../../../../util/address';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import { selectIsSignedIn } from '../../../../selectors/identity';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { getLinkedEvmAddress } from '../../../../selectors/profileController';
import { useProfileController } from '../../../Views/SocialLeaderboard/ManageProfileView/hooks/useProfileController';
import { isProfileNotFoundError } from '../../../Views/SocialLeaderboard/MyProfileView/utils/isProfileNotFoundError';
import { useTraderPositions } from '../../../Views/SocialLeaderboard/TraderProfileView/hooks/useTraderPositions';
import type { OpenComposerOptions } from '../../../Views/SocialLeaderboard/hooks/useOpenSocialPostComposer';
import {
  HYPERLIQUID_CHAIN_NAME,
  getPerpPositionDirection,
  isPerpPosition,
} from '../../SocialFeed/utils/perp';
import { PROVIDER_CONFIG } from '../constants/perpsConfig';
import { PERPS_SHARE_POSITION_INTERACTION_TYPE } from '../Views/PerpsSharePositionView/PerpsSharePositionView.constants';
import { usePerpsSocialEnabled } from './usePerpsSocialEnabled';

const PERPS_SHARE_SOCIAL_PROFILE_QUERY_KEY = [
  'perps',
  'shareSocialProfile',
] as const;
const PERPS_ACCOUNT_SCOPE = 'eip155:1';

type PerpsPostDirection = 'long' | 'short';

export const getPerpsShareDirection = (
  position: Position,
): PerpsPostDirection =>
  Number.parseFloat(position.size) > 0 ? 'long' : 'short';

export const findIndexedPerpsSocialPosition = ({
  position,
  accountAddress,
  linkedAddress,
  openPositions,
}: {
  position: Position;
  accountAddress?: string;
  linkedAddress: string | null;
  openPositions: SocialPosition[];
}): SocialPosition | undefined => {
  if (
    !linkedAddress ||
    accountAddress === undefined ||
    !areAddressesEqual(accountAddress, linkedAddress)
  ) {
    return undefined;
  }

  const providerId = position.providerId ?? PROVIDER_CONFIG.DefaultProvider;
  if (providerId !== PROVIDER_CONFIG.DefaultProvider) {
    return undefined;
  }

  const direction = getPerpsShareDirection(position);
  return openPositions.find(
    (candidate) =>
      isPerpPosition(candidate) &&
      candidate.chain?.toLowerCase() === HYPERLIQUID_CHAIN_NAME &&
      candidate.tokenSymbol === position.symbol &&
      getPerpPositionDirection(candidate) === direction,
  );
};

interface PostPerpsPositionToFeedParams {
  socialPosition: SocialPosition;
  symbol: string;
  direction: PerpsPostDirection;
  track: (
    event: (typeof MetaMetricsEvents)['PERPS_UI_INTERACTION'],
    properties: Record<string, string>,
  ) => void;
  openComposer: (options: OpenComposerOptions) => void;
}

export const postPerpsPositionToFeed = ({
  socialPosition,
  symbol,
  direction,
  track,
  openComposer,
}: PostPerpsPositionToFeedParams): void => {
  track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
    [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
      PERPS_SHARE_POSITION_INTERACTION_TYPE.POST_TO_METAMASK,
    [PERPS_EVENT_PROPERTY.ASSET]: symbol,
    [PERPS_EVENT_PROPERTY.DIRECTION]:
      direction === 'long'
        ? PERPS_EVENT_VALUE.DIRECTION.LONG
        : PERPS_EVENT_VALUE.DIRECTION.SHORT,
  });
  openComposer({
    position: socialPosition,
    entryPoint: 'perps',
    openFeedAfterPost: true,
  });
};

export interface UsePerpsCanPostPositionResult {
  accountAddress?: string;
  canPost: (position: Position, accountAddress?: string) => boolean;
  findSocialPosition: (
    position: Position,
    accountAddress?: string,
  ) => SocialPosition | undefined;
}

export const usePerpsCanPostPosition = (): UsePerpsCanPostPositionResult => {
  const isPerpsSocialEnabled = usePerpsSocialEnabled();
  const isSocialLeaderboardEnabled = useSelector(
    selectSocialLeaderboardEnabled,
  );
  const isSignedIn = useSelector(selectIsSignedIn);
  const accountAddress = useSelector(selectSelectedInternalAccountByScope)(
    PERPS_ACCOUNT_SCOPE,
  )?.address;
  const { profile: socialProfile, fetchAndUpdateProfile } =
    useProfileController();
  const isSocialFeedAvailable =
    isPerpsSocialEnabled && isSocialLeaderboardEnabled;
  const shouldLookUpProfile =
    isSocialFeedAvailable && isSignedIn && socialProfile === undefined;

  const { data: lookedUpProfileId } = useQuery({
    queryKey: [...PERPS_SHARE_SOCIAL_PROFILE_QUERY_KEY, isSignedIn],
    queryFn: async () => {
      const sessionProfile =
        await Engine.context.AuthenticationController.getSessionProfile();
      if (!sessionProfile?.profileId) {
        return null;
      }
      try {
        await fetchAndUpdateProfile(sessionProfile.profileId);
        return sessionProfile.profileId;
      } catch (error) {
        if (isProfileNotFoundError(error)) {
          return null;
        }
        throw error;
      }
    },
    enabled: shouldLookUpProfile,
    staleTime: Infinity,
    retry: false,
  });

  const hasProfile = socialProfile !== undefined || Boolean(lookedUpProfileId);
  const linkedAddress = socialProfile
    ? getLinkedEvmAddress(socialProfile.linkedAddresses)
    : null;
  const { openPositions } = useTraderPositions(
    isSocialFeedAvailable && linkedAddress ? linkedAddress : '',
  );

  const findSocialPosition = useCallback(
    (position: Position, shareAccount = accountAddress) => {
      if (!isSocialFeedAvailable || !hasProfile) {
        return undefined;
      }
      return findIndexedPerpsSocialPosition({
        position,
        accountAddress: shareAccount,
        linkedAddress,
        openPositions,
      });
    },
    [
      accountAddress,
      hasProfile,
      isSocialFeedAvailable,
      linkedAddress,
      openPositions,
    ],
  );

  const canPost = useCallback(
    (position: Position, shareAccount = accountAddress) =>
      findSocialPosition(position, shareAccount) !== undefined,
    [accountAddress, findSocialPosition],
  );

  return {
    accountAddress,
    canPost,
    findSocialPosition,
  };
};
