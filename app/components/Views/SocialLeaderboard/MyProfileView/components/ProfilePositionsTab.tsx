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
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { Position } from '@metamask/social-controllers';
import React, { useMemo } from 'react';
import { TouchableOpacity, type View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import DottedUnderline from '../../../../UI/DottedUnderline';
import { useTheme } from '../../../../../util/theme';
import PositionRow from '../../TraderProfileView/components/PositionRow';
import { PositionRowSkeleton } from '../../TraderProfileView/components/Skeletons';
import { MyProfileViewSelectorsIDs } from '../MyProfileView.testIds';
import { partitionUncountedPositions } from '../utils/partitionUncountedPositions';
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
  /**
   * When true, flagged rows use the V1 subline treatment and stay pressable
   * so position history can open. Own profiles omit this so flagged data
   * stays a normal row.
   */
  showFlaggedState?: boolean;
  uncountedSectionRef?: React.Ref<View>;
  uncountedHeaderRef?: React.Ref<View>;
  onUncountedSectionLayout?: () => void;
  /** Opens the uncounted-positions explainer. */
  onUncountedHeaderPress?: () => void;
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
  uncountedSectionRef,
  uncountedHeaderRef,
  onUncountedSectionLayout,
  onUncountedHeaderPress,
}) => {
  const { colors } = useTheme();
  const tw = useTailwind();
  const { counted, uncounted } = useMemo(() => {
    // Every viewer, including the owner, pins flagged rows after the counted
    // list. `showFlaggedState` draws the subline treatment and still passes
    // presses through, so history can open. The owner omits it. The filter
    // applies inside the pin.
    const split = partitionUncountedPositions(positions);

    return {
      counted: filterPositionsByAsset(split.counted, filter),
      uncounted: filterPositionsByAsset(split.uncounted, filter),
    };
  }, [filter, positions]);
  const isEmpty = counted.length === 0 && uncounted.length === 0;
  const emptyMessage = strings(
    getProfilePositionsEmptyMessageKey(isClosed ? 'closed' : 'open', filter),
  );

  const uncountedAccessibilityLabel = strings(
    uncounted.length === 1
      ? 'social_leaderboard.my_profile.not_counted_section_a11y_one'
      : 'social_leaderboard.my_profile.not_counted_section_a11y_other',
    { count: uncounted.length },
  );
  const renderRows = (sectionPositions: Position[]) =>
    sectionPositions.map((position) => (
      <PositionRow
        key={getPositionListKey(position)}
        position={position}
        isClosed={isClosed}
        showTradeDate={isClosed}
        flaggedPresentation={showFlaggedState ? 'subline' : undefined}
        onPress={onPositionPress}
      />
    ));

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
        <>
          {renderRows(counted)}
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
                onPress={onUncountedHeaderPress}
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
    </Box>
  );
};

export default ProfilePositionsTab;
