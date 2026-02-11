import React, { useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextVariant,
  Icon,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  DropStatus,
  type SeasonDropDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import RewardsThemeImageComponent from '../ThemeImageComponent';
import { getDropStatusInfo } from './DropTile.Utils';
import { useDropLeaderboard } from '../../hooks/useDropLeaderboard';
import { strings } from '../../../../../../locales/i18n';
import { formatNumber } from '../../utils/formatUtils';
import { DROP_LEADERBOARD_RANK_TBD } from '../../../../../reducers/rewards';

interface DropTileProps {
  /**
   * The drop data to display
   */
  drop: SeasonDropDto;
}

/**
 * DropTile component displays drop information with status and leaderboard position.
 *
 * Shows:
 * - Background image
 * - Status description with date (top)
 * - Status label with leaderboard position when applicable (bottom)
 * - Prize information
 *
 * When status is 'live':
 * - If user is on leaderboard: Shows "Live • You're #XXXX"
 * - If user is NOT on leaderboard: Shows "Live • XXXX entered"
 */
const DropTile: React.FC<DropTileProps> = ({ drop }) => {
  const tw = useTailwind();

  const { status, statusLabel, statusDescription, statusDescriptionIcon } =
    useMemo(() => getDropStatusInfo(drop), [drop]);

  // Use the leaderboard hook internally to get user position (only when live)
  const { leaderboard } = useDropLeaderboard(
    status === DropStatus.OPEN ? drop.id : undefined,
  );

  // Compute the display status label based on leaderboard data
  const displayStatusLabel = useMemo(() => {
    if (status === DropStatus.OPEN) {
      if (leaderboard?.userPosition?.rank !== undefined) {
        // User is on the leaderboard - show their position
        // If rank is TBD (pending calculation), show "TBD" instead of the number
        const rankDisplay =
          leaderboard.userPosition.rank === DROP_LEADERBOARD_RANK_TBD
            ? 'TBD'
            : formatNumber(leaderboard.userPosition.rank);
        return strings('rewards.drop.pill_live_with_position', {
          rank: rankDisplay,
        });
      }
      if (leaderboard?.totalParticipants !== undefined) {
        // User is not on leaderboard - show total participants
        return strings('rewards.drop.pill_live_with_participants', {
          count: formatNumber(leaderboard.totalParticipants),
        });
      }
    }
    return statusLabel;
  }, [status, leaderboard, statusLabel]);

  // Format prize display (e.g., "$50,000 Monad")
  const prizeDisplay = useMemo(() => `${drop.name}`, [drop]);

  return (
    <Box twClassName="rounded-lg overflow-hidden relative h-50">
      {/* Background Image */}
      <View style={tw.style('absolute w-full h-full')}>
        <RewardsThemeImageComponent
          themeImage={drop.image}
          style={tw.style('w-full h-full')}
          resizeMode="cover"
        />
      </View>

      {/* Content */}
      <Box
        flexDirection={BoxFlexDirection.Column}
        justifyContent={BoxJustifyContent.Between}
        twClassName="p-4 flex-1"
      >
        {/* Status Description Icon and Text */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-1"
        >
          {status === DropStatus.CLOSED ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Icon
              name={statusDescriptionIcon}
              size={IconSize.Sm}
              twClassName="text-white "
            />
          )}
          <Text variant={TextVariant.BodySm} twClassName="text-white ">
            {statusDescription}
          </Text>
        </Box>

        {/* Bottom Content */}
        <Box flexDirection={BoxFlexDirection.Column}>
          <Text variant={TextVariant.BodySm} twClassName="text-white">
            {displayStatusLabel}
          </Text>

          {/* Prize Info */}
          <Text
            variant={TextVariant.HeadingLg}
            twClassName="text-white font-bold"
          >
            {prizeDisplay}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default DropTile;
