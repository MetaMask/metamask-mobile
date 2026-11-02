import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import ErrorState from '../../../../Views/Homepage/components/ErrorState';
import {
  SocialV1TraderRow,
  SocialV1TraderRowSkeleton,
} from '../../../../Views/SocialLeaderboard/TopTradersView/components';
import { navigateToSocialV1Profile } from '../../../../Views/SocialLeaderboard/navigation/navigateToSocialV1Profile';
import SocialLeaderboardMessage from '../../../SocialLeaderboard/components/SocialLeaderboardMessage';
import { useMyProfile } from '../../../../Views/SocialLeaderboard/MyProfileView/hooks';
import {
  usePerpsTopTraders,
  type UsePerpsTopTradersOptions,
} from '../../hooks/usePerpsTopTraders';
import { PerpsHomeViewSelectorsIDs } from '../../Perps.testIds';

export const PERPS_HOME_TOP_TRADERS_LIMIT = 5;

const noop = () => undefined;

interface PerpsSocialTopTradersProps {
  onSeeMorePress: () => void;
  limit?: number;
  timeframe?: UsePerpsTopTradersOptions['timeframe'];
  source?: string;
  /** Shown when there are no traders; renders nothing when omitted. */
  emptyMessage?: string;
}

const PerpsSocialTopTraders: React.FC<PerpsSocialTopTradersProps> = ({
  onSeeMorePress,
  limit = PERPS_HOME_TOP_TRADERS_LIMIT,
  timeframe,
  source = PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
  emptyMessage,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { profile: myProfile } = useMyProfile();
  const { traders, showSkeleton, showError, refresh } = usePerpsTopTraders({
    limit,
    timeframe,
  });

  const handleTraderPress = useCallback(
    (traderId: string, traderName: string) => {
      const trader = traders.find((item) => item.id === traderId);
      navigateToSocialV1Profile(navigation, {
        traderId,
        traderName,
        traderAddress: trader?.address,
        traderAvatarUri: trader?.avatarUri,
        source,
        traderRank: trader?.rank,
        viewerProfileId: myProfile?.profileId ?? undefined,
        viewerAddress: myProfile?.linkedAccountAddress ?? undefined,
      });
    },
    [navigation, traders, myProfile, source],
  );

  if (showError) {
    return (
      <ErrorState
        title={strings('homepage.error.unable_to_load', {
          section: strings('perps.home.top_traders').toLowerCase(),
        })}
        onRetry={refresh}
      />
    );
  }

  if (showSkeleton) {
    return (
      <>
        {Array.from({ length: limit }, (_, index) => (
          <SocialV1TraderRowSkeleton key={`top-trader-skeleton-${index}`} />
        ))}
      </>
    );
  }

  if (traders.length === 0) {
    return emptyMessage ? (
      <SocialLeaderboardMessage
        message={emptyMessage}
        testID={PerpsHomeViewSelectorsIDs.SOCIAL_FEED_TOP_TRADERS_EMPTY}
      />
    ) : null;
  }

  return (
    <>
      {traders.map((trader) => (
        <SocialV1TraderRow
          key={trader.id}
          trader={trader}
          metric={trader.displayMetric}
          onTraderPress={handleTraderPress}
          onFollowPress={noop}
        />
      ))}
      <Box twClassName="px-4 pt-3">
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Md}
          isFullWidth
          onPress={onSeeMorePress}
          testID={PerpsHomeViewSelectorsIDs.SOCIAL_FEED_SEE_MORE}
        >
          {strings('perps.home.see_more')}
        </Button>
      </Box>
    </>
  );
};

export default PerpsSocialTopTraders;
