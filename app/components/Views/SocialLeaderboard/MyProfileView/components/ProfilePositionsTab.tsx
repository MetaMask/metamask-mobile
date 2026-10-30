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
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { Position } from '@metamask/social-controllers';
import React, { useCallback, useMemo, useState } from 'react';
import { TouchableOpacity, type View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import DottedUnderline from '../../../../UI/DottedUnderline';
import { useTheme } from '../../../../../util/theme';
import PositionRow from '../../TraderProfileView/components/PositionRow';
import { PositionRowSkeleton } from '../../TraderProfileView/components/Skeletons';
import { getPositionFlagLabelKey } from '../../TraderProfileView/utils/positionFlags';
import { MyProfileViewSelectorsIDs } from '../MyProfileView.testIds';
import {
  filterPositionsByAsset,
  partitionUncountedPositions,
} from '../utils/partitionUncountedPositions';
import {
  getFilteredPositionSections,
  getProfilePositionsEmptyMessageKey,
  type ProfileAssetFilter,
} from '../utils/splitPositionsByType';
import UncountedPositionsSheet from './UncountedPositionsSheet';

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
  showFlaggedState?: boolean;
  /** Measured so the P&L note can scroll this section into view. */
  uncountedSectionRef?: React.Ref<View>;
  /** Header moved to after the profile scrolls to this section. */
  uncountedHeaderRef?: React.Ref<View>;
  /** Called whenever the pinned section lays out. */
  onUncountedSectionLayout?: () => void;
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
  showFlaggedState,
  uncountedSectionRef,
  uncountedHeaderRef,
  onUncountedSectionLayout,
}) => {
  const { colors } = useTheme();
  const tw = useTailwind();
  const [isUncountedSheetOpen, setIsUncountedSheetOpen] = useState(false);
  const { tokens, perps, uncounted } = useMemo(() => {
    // Only other traders (`showFlaggedState`) move flagged rows into the
    // pinned section. The rows themselves stay full color.
    // This list is already one Open or Closed tab, so the pin is per tab.
    const split = showFlaggedState
      ? partitionUncountedPositions(positions)
      : { counted: positions, uncounted: [] as Position[] };
    const sections = getFilteredPositionSections(split.counted, filter);

    return {
      ...sections,
      uncounted: filterPositionsByAsset(split.uncounted, filter),
    };
  }, [filter, positions, showFlaggedState]);
  const showSectionHeaders = filter === 'all';
  const isEmpty =
    tokens.length === 0 && perps.length === 0 && uncounted.length === 0;
  const emptyMessage = strings(
    getProfilePositionsEmptyMessageKey(isClosed ? 'closed' : 'open', filter),
  );

  const uncountedAccessibilityLabel = strings(
    uncounted.length === 1
      ? 'social_leaderboard.my_profile.not_counted_section_a11y_one'
      : 'social_leaderboard.my_profile.not_counted_section_a11y_other',
    { count: uncounted.length },
  );
  const handleOpenUncountedSheet = useCallback(() => {
    setIsUncountedSheetOpen(true);
  }, []);
  const handleCloseUncountedSheet = useCallback(() => {
    setIsUncountedSheetOpen(false);
  }, []);

  const renderRows = (sectionPositions: Position[]) =>
    sectionPositions.map((position) => (
      <PositionRow
        key={getPositionListKey(position)}
        position={position}
        isClosed={isClosed}
        showTradeDate={isClosed}
        // Legacy showFlaggedState greys the row. #38564 replaces this line
        // with flaggedPresentation="subline" for the full-color "· Insider" label.
        showFlaggedState={false}
        onPress={
          showFlaggedState && getPositionFlagLabelKey(position)
            ? undefined
            : onPositionPress
        }
      />
    ));

  return (
    <Box paddingTop={4} testID={MyProfileViewSelectorsIDs.POSITIONS_LIST}>
      <FilterButtonGroup
        value={filter}
        onChange={(value) => onFilterChange(value as ProfileAssetFilter)}
        variant={FilterButtonVariant.Primary}
        twClassName="px-4 pb-3"
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
          {uncounted.length > 0 ? (
            <Box
              ref={uncountedSectionRef}
              collapsable={false}
              onLayout={onUncountedSectionLayout}
              testID={MyProfileViewSelectorsIDs.UNCOUNTED_SECTION}
            >
              <TouchableOpacity
                ref={uncountedHeaderRef}
                accessibilityRole="button"
                accessibilityLabel={uncountedAccessibilityLabel}
                onPress={handleOpenUncountedSheet}
                style={tw.style(
                  'min-h-11 self-start items-center justify-center px-4 py-2',
                )}
                testID={MyProfileViewSelectorsIDs.UNCOUNTED_SECTION_HEADER}
              >
                <DottedUnderline
                  color={colors.text.default}
                  twClassName="self-start shrink-0"
                >
                  <Text
                    variant={TextVariant.BodySm}
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextDefault}
                    numberOfLines={1}
                    twClassName="-mt-0.5 shrink-0"
                  >
                    {strings(
                      'social_leaderboard.my_profile.not_counted_in_pnl',
                    )}
                  </Text>
                </DottedUnderline>
              </TouchableOpacity>
              {renderRows(uncounted)}
            </Box>
          ) : null}
        </>
      )}
      {isUncountedSheetOpen ? (
        <UncountedPositionsSheet onClose={handleCloseUncountedSheet} />
      ) : null}
    </Box>
  );
};

export default ProfilePositionsTab;
