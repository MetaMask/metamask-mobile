import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FilterButton,
  FilterButtonGroup,
  FilterButtonVariant,
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
import { MyProfileViewSelectorsIDs } from '../MyProfileView.testIds';
import {
  getFilteredPositionSections,
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
  onFilterChange: (filter: ProfileAssetFilter) => void;
  onPositionPress: (position: Position) => void;
  onRetry: () => void;
}

const ProfilePositionsTab: React.FC<ProfilePositionsTabProps> = ({
  positions,
  isLoading,
  error,
  isClosed,
  filter,
  onFilterChange,
  onPositionPress,
  onRetry,
}) => {
  const { tokens, perps } = useMemo(
    () => getFilteredPositionSections(positions, filter),
    [filter, positions],
  );
  const showSectionHeaders = filter === 'all';
  const isEmpty = tokens.length === 0 && perps.length === 0;
  const emptyMessage = strings(
    getProfilePositionsEmptyMessageKey(isClosed ? 'closed' : 'open', filter),
  );

  const renderRows = (sectionPositions: Position[]) =>
    sectionPositions.map((position) => (
      <PositionRow
        key={getPositionListKey(position)}
        position={position}
        isClosed={isClosed}
        showTradeDate={isClosed}
        onPress={onPositionPress}
      />
    ));

  return (
    <Box testID={MyProfileViewSelectorsIDs.POSITIONS_LIST}>
      <FilterButtonGroup
        value={filter}
        onChange={(value) => onFilterChange(value as ProfileAssetFilter)}
        variant={FilterButtonVariant.Primary}
        twClassName="px-4 py-3"
        testID={MyProfileViewSelectorsIDs.ASSET_FILTER}
      >
        <FilterButton
          value="all"
          testID={MyProfileViewSelectorsIDs.ASSET_FILTER_ALL}
        >
          {strings('social_leaderboard.shell.filters.type.all')}
        </FilterButton>
        <FilterButton
          value="tokens"
          testID={MyProfileViewSelectorsIDs.ASSET_FILTER_TOKENS}
        >
          {strings('social_leaderboard.shell.filters.type.tokens')}
        </FilterButton>
        <FilterButton
          value="perps"
          testID={MyProfileViewSelectorsIDs.ASSET_FILTER_PERPS}
        >
          {strings('social_leaderboard.shell.filters.type.perps')}
        </FilterButton>
      </FilterButtonGroup>

      {error && isEmpty ? (
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="w-full px-4 py-16 gap-3"
          testID={MyProfileViewSelectorsIDs.POSITIONS_ERROR}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            twClassName="text-center"
          >
            {strings('social_leaderboard.feed.error.title')}
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
        <>
          {tokens.length > 0 ? (
            <Box testID={MyProfileViewSelectorsIDs.TOKENS_SECTION}>
              {showSectionHeaders ? (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextMuted}
                  twClassName="px-4 pt-2 pb-1"
                >
                  {strings('social_leaderboard.my_profile.section_tokens')}
                </Text>
              ) : null}
              {renderRows(tokens)}
            </Box>
          ) : null}
          {perps.length > 0 ? (
            <Box testID={MyProfileViewSelectorsIDs.PERPS_SECTION}>
              {showSectionHeaders ? (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextMuted}
                  twClassName="px-4 pt-2 pb-1"
                >
                  {strings('social_leaderboard.my_profile.section_perpetuals')}
                </Text>
              ) : null}
              {renderRows(perps)}
            </Box>
          ) : null}
        </>
      )}
    </Box>
  );
};

export default ProfilePositionsTab;
