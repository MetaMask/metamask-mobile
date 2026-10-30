import {
  Box,
  BoxFlexDirection,
  FontWeight,
  SectionDivider,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { TouchableOpacity } from 'react-native';
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

/**
 * Body Sm is 22pt tall. 11pt of slop above and below makes a 44pt target
 * without growing the header.
 */
const UNCOUNTED_NOTE_HIT_SLOP = { top: 11, bottom: 11, left: 0, right: 0 };

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
   * Flagged positions the profile list is showing. The note stays hidden at 0
   * and sits under the Performance title. The P&L cell label stays "P&L".
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
  const tw = useTailwind();
  if (cells.length === 0) {
    return null;
  }

  const uncountedNoteKey =
    uncountedCount === 1
      ? 'social_leaderboard.my_profile.not_counted_note_one'
      : 'social_leaderboard.my_profile.not_counted_note_other';
  const uncountedNote =
    uncountedCount > 0
      ? strings(uncountedNoteKey, { count: uncountedCount })
      : null;

  return (
    <Box>
      <SectionDivider marginVertical={6} />
      <Box testID={MyProfileViewSelectorsIDs.PERFORMANCE_SECTION}>
        <Box twClassName="flex-col gap-1 pt-3 px-4">
          <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
            {strings('social_leaderboard.my_profile.performance_30d')}
          </Text>
          {uncountedNote ? (
            <Box twClassName="w-full items-start">
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={uncountedNote}
                accessibilityHint={strings(
                  'social_leaderboard.my_profile.not_counted_note_hint',
                )}
                hitSlop={UNCOUNTED_NOTE_HIT_SLOP}
                onPress={onUncountedPress}
                style={tw.style('max-w-full self-start')}
                testID={MyProfileViewSelectorsIDs.PERFORMANCE_PNL_UNCOUNTED}
              >
                <DottedUnderline
                  color={colors.text.default}
                  twClassName="self-start"
                >
                  <Text
                    variant={TextVariant.BodySm}
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextDefault}
                    twClassName="-mt-0.5"
                  >
                    {uncountedNote}
                  </Text>
                </DottedUnderline>
              </TouchableOpacity>
            </Box>
          ) : null}
        </Box>
        <Box gap={2} twClassName="px-4 py-3">
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
