import {
  Box,
  BoxFlexDirection,
  FontWeight,
  SectionDivider,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { Pressable } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import DottedUnderline from '../../../../UI/DottedUnderline';
import { useTheme } from '../../../../../util/theme';
import { MyProfileViewSelectorsIDs } from '../MyProfileView.testIds';
import type {
  PerformanceCell,
  PerformanceCellId,
} from '../utils/overlayMyProfileLiveStats';

const CELL_CONFIG: Record<
  PerformanceCellId,
  { labelKey: string; testID: string }
> = {
  pnl: {
    labelKey: 'social_leaderboard.my_profile.pnl',
    testID: MyProfileViewSelectorsIDs.PERFORMANCE_PNL,
  },
  winRate: {
    labelKey: 'social_leaderboard.my_profile.win_rate',
    testID: MyProfileViewSelectorsIDs.PERFORMANCE_WIN_RATE,
  },
  holdTime: {
    labelKey: 'social_leaderboard.my_profile.avg_hold_time',
    testID: MyProfileViewSelectorsIDs.PERFORMANCE_HOLD_TIME,
  },
  volume: {
    labelKey: 'social_leaderboard.my_profile.volume',
    testID: MyProfileViewSelectorsIDs.PERFORMANCE_VOLUME,
  },
};

const TONE_CLASS: Record<PerformanceCell['tone'], string | undefined> = {
  default: undefined,
  success: 'text-success-default',
  error: 'text-error-default',
};

const chunkPairs = (cells: PerformanceCell[]): PerformanceCell[][] => {
  const rows: PerformanceCell[][] = [];
  for (let index = 0; index < cells.length; index += 2) {
    rows.push(cells.slice(index, index + 2));
  }
  return rows;
};

interface MyProfilePerformanceStatsProps {
  cells: PerformanceCell[];
  /**
   * Flagged positions the profile list is showing. The note stays hidden at 0.
   * Attached to the existing 30D P&L cell; Figma's "Realized P&L" label is not
   * used here.
   */
  uncountedCount?: number;
  /** Scrolls the profile to the pinned uncounted section. */
  onUncountedPress?: () => void;
}

const MyProfilePerformanceStats: React.FC<MyProfilePerformanceStatsProps> = ({
  cells,
  uncountedCount = 0,
  onUncountedPress,
}) => {
  const { colors } = useTheme();
  if (cells.length === 0) {
    return null;
  }

  const uncountedNote =
    uncountedCount > 0
      ? strings(
          uncountedCount === 1
            ? 'social_leaderboard.my_profile.not_counted_note_one'
            : 'social_leaderboard.my_profile.not_counted_note_other',
          { count: uncountedCount },
        )
      : null;

  return (
    <Box>
      <SectionDivider marginVertical={6} />
      <Box
        twClassName="px-4"
        testID={MyProfileViewSelectorsIDs.PERFORMANCE_SECTION}
      >
        <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
          {strings('social_leaderboard.my_profile.performance_30d')}
        </Text>
        <Box gap={2} twClassName="pt-3">
          {chunkPairs(cells).map((row) => (
            <Box
              key={row.map((cell) => cell.id).join('-')}
              flexDirection={BoxFlexDirection.Row}
              gap={4}
            >
              {row.map((cell) => (
                <Box key={cell.id} twClassName="flex-1 min-w-0 gap-0.5">
                  <Text
                    variant={TextVariant.BodySm}
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextAlternative}
                    numberOfLines={1}
                  >
                    {strings(CELL_CONFIG[cell.id].labelKey)}
                  </Text>
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                    twClassName={TONE_CLASS[cell.tone]}
                    numberOfLines={1}
                    testID={CELL_CONFIG[cell.id].testID}
                  >
                    {cell.value}
                  </Text>
                  {cell.id === 'pnl' && uncountedNote ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={strings(
                        uncountedCount === 1
                          ? 'social_leaderboard.my_profile.not_counted_pnl_a11y_one'
                          : 'social_leaderboard.my_profile.not_counted_pnl_a11y_other',
                        { value: cell.value, count: uncountedCount },
                      )}
                      onPress={onUncountedPress}
                      testID={
                        MyProfileViewSelectorsIDs.PERFORMANCE_PNL_UNCOUNTED
                      }
                    >
                      <DottedUnderline color={colors.text.default}>
                        <Text
                          variant={TextVariant.BodySm}
                          fontWeight={FontWeight.Medium}
                          color={TextColor.TextDefault}
                        >
                          {uncountedNote}
                        </Text>
                      </DottedUnderline>
                    </Pressable>
                  ) : null}
                </Box>
              ))}
              {row.length === 1 ? <Box twClassName="flex-1" /> : null}
            </Box>
          ))}
        </Box>
      </Box>
      <SectionDivider marginVertical={0} twClassName="mt-6" />
    </Box>
  );
};

export default MyProfilePerformanceStats;
