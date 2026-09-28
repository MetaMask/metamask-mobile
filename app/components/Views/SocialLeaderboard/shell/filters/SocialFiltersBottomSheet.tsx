import React, { useCallback, useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  ButtonSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import {
  COHORT_LABEL_KEY,
  COHORT_LEADING_EMOJI,
  COHORT_OPTIONS_WITH_FOLLOWING,
  COHORT_OPTIONS_WITHOUT_FOLLOWING,
  MARKET_CAP_RANGE,
  NETWORK_LABEL_KEY,
  NETWORK_OPTIONS,
  TIMEFRAME_LABEL_KEY,
  TIMEFRAME_OPTIONS,
  TYPE_LABEL_KEY,
  TYPE_OPTIONS,
  VOLUME_24H_RANGE,
} from './filterDefaults';
import {
  SocialFiltersBottomSheetSelectorsIDs,
  getFilterRangeTestId,
} from './SocialFiltersBottomSheet.testIds';
import FilterChipSection from './sections/FilterChipSection';
import FilterRangeSection from './sections/FilterRangeSection';
import type {
  SocialFilterNetwork,
  SocialFilterTimeframe,
  SocialFilterType,
  SocialRangeFilter,
  SocialShellFilters,
  SocialTraderCohort,
} from './types';
import type { SocialShellTab } from '../types';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export interface SocialFiltersBottomSheetProps {
  /** Tab whose filters are being edited. */
  tab: SocialShellTab;
  /** Current draft state (owned by `useSocialShellFilters`). */
  draft: SocialShellFilters;
  /** Called when the user edits any filter chip/slider. */
  onChange: (patch: Partial<SocialShellFilters>) => void;
  /** Called when the user taps "Show results". Commits the draft. */
  onApply: () => void;
  /** Called when the user dismisses the sheet (backdrop tap, close button). */
  onClose: () => void;
}

const formatMarketCapLabel = (value: SocialRangeFilter) =>
  `$${value.min}B - $${value.max}B`;

const formatVolume24hLabel = (value: SocialRangeFilter) =>
  `$${value.min}M - $${value.max}M`;

/**
 * Unified Filters bottom sheet for the Social Bundle V1 shell. Replaces the
 * per-filter `FilterOptionSheet` pattern with a single sheet that shows
 * tab-specific sections. The sheet is mounted inside a full-screen `Modal`
 * (same pattern as the V0 `FilterOptionSheet`) so the backdrop covers the
 * header + tabs, but renders the MMDS `BottomSheet` inside.
 *
 * The sheet is a controlled component: the parent owns the draft state via
 * `useSocialShellFilters` and passes `onChange` patches. "Show results"
 * triggers `onApply`, which commits the draft and closes the sheet.
 */
const SocialFiltersBottomSheet: React.FC<SocialFiltersBottomSheetProps> = ({
  tab,
  draft,
  onChange,
  onApply,
  onClose,
}) => {
  const { colors } = useTheme();

  // Per-tab section visibility (from the Figma screenshots).
  const showTimeframe = tab !== 'liveTrades';
  const showRanges = tab !== 'leaderboard';
  const cohortOptions =
    tab === 'leaderboard'
      ? COHORT_OPTIONS_WITHOUT_FOLLOWING
      : COHORT_OPTIONS_WITH_FOLLOWING;

  const handleTypeChange = useCallback(
    (next: string) => onChange({ type: next as SocialFilterType }),
    [onChange],
  );
  const handleCohortChange = useCallback(
    (next: string) => onChange({ traderCohort: next as SocialTraderCohort }),
    [onChange],
  );
  const handleTimeframeChange = useCallback(
    (next: string) => onChange({ timeframe: next as SocialFilterTimeframe }),
    [onChange],
  );
  const handleNetworkChange = useCallback(
    (next: string) => onChange({ network: next as SocialFilterNetwork }),
    [onChange],
  );
  const handleMarketCapChange = useCallback(
    (next: SocialRangeFilter) => onChange({ marketCap: next }),
    [onChange],
  );
  const handleVolume24hChange = useCallback(
    (next: SocialRangeFilter) => onChange({ volume24h: next }),
    [onChange],
  );

  const typeOptions = useMemo(
    () =>
      TYPE_OPTIONS.map((id) => ({
        id,
        labelKey: TYPE_LABEL_KEY[id],
      })),
    [],
  );
  const cohortOptionObjects = useMemo(
    () =>
      cohortOptions.map((id) => ({
        id,
        labelKey: COHORT_LABEL_KEY[id],
        leadingEmoji: COHORT_LEADING_EMOJI[id],
      })),
    [cohortOptions],
  );
  const timeframeOptions = useMemo(
    () =>
      TIMEFRAME_OPTIONS.map((id) => ({
        id,
        labelKey: TIMEFRAME_LABEL_KEY[id],
      })),
    [],
  );
  const networkOptions = useMemo(
    () =>
      NETWORK_OPTIONS.map((id) => ({
        id,
        labelKey: NETWORK_LABEL_KEY[id],
      })),
    [],
  );

  const showResultsButtonProps = useMemo(
    () => ({
      children: strings('social_leaderboard.shell.filters.show_results'),
      onPress: onApply,
      size: ButtonSize.Lg,
      testID: SocialFiltersBottomSheetSelectorsIDs.SHOW_RESULTS,
    }),
    [onApply],
  );

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.root}>
          <Box twClassName="absolute inset-0">
            <Pressable
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.overlay.default },
              ]}
              onPress={onClose}
              accessibilityRole="button"
              testID={SocialFiltersBottomSheetSelectorsIDs.BACKDROP}
            />

            <BottomSheet
              onClose={onClose}
              testID={SocialFiltersBottomSheetSelectorsIDs.SHEET}
            >
              <BottomSheetHeader
                onClose={onClose}
                closeButtonProps={{
                  testID: SocialFiltersBottomSheetSelectorsIDs.CLOSE_BUTTON,
                }}
              >
                {strings('social_leaderboard.shell.filters.title')}
              </BottomSheetHeader>

              <ScrollView>
                <Box twClassName="px-4 pb-4">
                  <FilterChipSection<SocialFilterType>
                    titleKey="social_leaderboard.shell.filters.section.type"
                    options={typeOptions}
                    value={draft.type}
                    onChange={handleTypeChange}
                    testID="social-filters-type"
                  />

                  <FilterChipSection<SocialTraderCohort>
                    titleKey="social_leaderboard.shell.filters.section.trader_cohort"
                    options={cohortOptionObjects}
                    value={draft.traderCohort}
                    onChange={handleCohortChange}
                    testID="social-filters-cohort"
                  />

                  {showTimeframe ? (
                    <FilterChipSection<SocialFilterTimeframe>
                      titleKey="social_leaderboard.shell.filters.section.timeframe"
                      options={timeframeOptions}
                      value={draft.timeframe}
                      onChange={handleTimeframeChange}
                      testID="social-filters-timeframe"
                    />
                  ) : null}

                  <FilterChipSection<SocialFilterNetwork>
                    titleKey="social_leaderboard.shell.filters.section.network"
                    options={networkOptions}
                    value={draft.network}
                    onChange={handleNetworkChange}
                    testID="social-filters-network"
                  />

                  {showRanges ? (
                    <>
                      <FilterRangeSection
                        titleKey="social_leaderboard.shell.filters.section.market_cap"
                        minimumValue={MARKET_CAP_RANGE.min}
                        maximumValue={MARKET_CAP_RANGE.max}
                        value={draft.marketCap}
                        onValueChange={handleMarketCapChange}
                        formatLabel={formatMarketCapLabel}
                        testID={getFilterRangeTestId('market_cap')}
                      />
                      <FilterRangeSection
                        titleKey="social_leaderboard.shell.filters.section.volume_24h"
                        minimumValue={VOLUME_24H_RANGE.min}
                        maximumValue={VOLUME_24H_RANGE.max}
                        value={draft.volume24h}
                        onValueChange={handleVolume24hChange}
                        formatLabel={formatVolume24hLabel}
                        testID={getFilterRangeTestId('volume_24h')}
                      />
                    </>
                  ) : null}
                </Box>
              </ScrollView>

              <BottomSheetFooter primaryButtonProps={showResultsButtonProps} />
            </BottomSheet>
          </Box>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </Modal>
  );
};

export default SocialFiltersBottomSheet;
