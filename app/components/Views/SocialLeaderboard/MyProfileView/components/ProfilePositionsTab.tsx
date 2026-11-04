import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { Position } from '@metamask/social-controllers';
import React, { useMemo } from 'react';
import { strings } from '../../../../../../locales/i18n';
import PositionRow from '../../TraderProfileView/components/PositionRow';
import { PositionRowSkeleton } from '../../TraderProfileView/components/Skeletons';
import { getPositionFlagLabelKey } from '../../TraderProfileView/utils/positionFlags';
import { MyProfileViewSelectorsIDs } from '../MyProfileView.testIds';
import {
  filterPositionsByAsset,
  getProfilePositionsEmptyMessageKey,
  type ProfileAssetFilter,
} from '../utils/splitPositionsByType';

const POSITION_SKELETON_KEYS = ['s1', 's2', 's3', 's4'] as const;

const getPositionListKey = (position: Position): string =>
  position.positionId ?? `${position.tokenAddress}-${position.chain}`;

export interface ProfilePositionsTabProps {
  positions: Position[];
  isLoading: boolean;
  error: string | null;
  isClosed: boolean;
  filter: ProfileAssetFilter;
  onPositionPress: (position: Position) => void;
  onRetry: () => void;
  showFlaggedState?: boolean;
}

const ProfilePositionsTab: React.FC<ProfilePositionsTabProps> = ({
  positions,
  isLoading,
  error,
  isClosed,
  filter,
  onPositionPress,
  onRetry,
  showFlaggedState,
}) => {
  const visiblePositions = useMemo(
    () => filterPositionsByAsset(positions, filter),
    [filter, positions],
  );
  const isEmpty = visiblePositions.length === 0;
  const emptyMessage = strings(
    getProfilePositionsEmptyMessageKey(isClosed ? 'closed' : 'open', filter),
  );

  return (
    <Box paddingTop={4} testID={MyProfileViewSelectorsIDs.POSITIONS_LIST}>
      {error && isEmpty ? (
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="w-full px-4 py-16 gap-3"
          testID={MyProfileViewSelectorsIDs.POSITIONS_ERROR}
        >
          <Text
            variant={TextVariant.HeadingSm}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
            twClassName="text-center"
          >
            {strings('social_leaderboard.feed.error.title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('social_leaderboard.feed.error.description')}
          </Text>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            onPress={onRetry}
            twClassName="self-center"
            testID={MyProfileViewSelectorsIDs.POSITIONS_RETRY_BUTTON}
          >
            {strings('social_leaderboard.feed.error.retry')}
          </Button>
        </Box>
      ) : isLoading && isEmpty ? (
        POSITION_SKELETON_KEYS.map((key) => <PositionRowSkeleton key={key} />)
      ) : isEmpty ? (
        <Box
          twClassName="px-4 py-8"
          alignItems={BoxAlignItems.Center}
          testID={MyProfileViewSelectorsIDs.POSITIONS_EMPTY}
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {emptyMessage}
          </Text>
        </Box>
      ) : (
        visiblePositions.map((position) => (
          <PositionRow
            key={getPositionListKey(position)}
            position={position}
            isClosed={isClosed}
            showTradeDate={isClosed}
            showFlaggedState={showFlaggedState}
            onPress={
              showFlaggedState && getPositionFlagLabelKey(position)
                ? undefined
                : onPositionPress
            }
          />
        ))
      )}
    </Box>
  );
};

export default ProfilePositionsTab;
