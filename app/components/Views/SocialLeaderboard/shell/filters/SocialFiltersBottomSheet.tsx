import React, { useCallback, useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  ButtonsAlignment,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import {
  COHORT_LABEL_KEY,
  COHORT_LEADING_EMOJI,
  COHORT_OPTIONS_FOLLOWING,
  COHORT_OPTIONS_LEADERBOARD,
  COHORT_OPTIONS_LIVE_TRADES,
  MARKET_CAP_RANGE,
  TIMEFRAME_LABEL_KEY,
  TIMEFRAME_OPTIONS,
  TYPE_LABEL_KEY,
  TYPE_OPTIONS,
  TYPE_OPTIONS_FOLLOWING,
  VERIFICATION_LABEL_KEY,
  VERIFICATION_OPTIONS,
  VOLUME_24H_RANGE,
} from './filterDefaults';
import {
  SocialFiltersBottomSheetSelectorsIDs,
  getFilterRangeTestId,
} from './SocialFiltersBottomSheet.testIds';
import FilterChipSection from './sections/FilterChipSection';
import FilterRangeSection from './sections/FilterRangeSection';
import type {
  SocialFilterTimeframe,
  SocialFilterType,
  SocialFilterVerification,
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
  /** Called when the user taps Apply. Commits the draft. */
  onApply: () => void;
  /** Called when the user taps Reset. Restores the draft to defaults. */
  onReset: () => void;
  /** Called when the user dismisses the sheet (backdrop tap, close button). */
  onClose: () => void;
}

const formatMarketCapLabel = (value: SocialRangeFilter) =>
  `$${value.min}B - $${value.max}B`;

const formatVolume24hLabel = (value: SocialRangeFilter) =>
  `$${value.min}M - $${value.max}M`;

const cohortOptionsForTab = (tab: SocialShellTab): SocialTraderCohort[] => {
  if (tab === 'leaderboard') {
    return COHORT_OPTIONS_LEADERBOARD;
  }
  if (tab === 'liveTrades') {
    return COHORT_OPTIONS_LIVE_TRADES;
  }
  return COHORT_OPTIONS_FOLLOWING;
};

/**
 * Unified Filters bottom sheet for the Social Bundle V1 shell.
 */
const SocialFiltersBottomSheet: React.FC<SocialFiltersBottomSheetProps> = ({
  tab,
  draft,
  onChange,
  onApply,
  onReset,
  onClose,
}) => {
  const { colors } = useTheme();

  const showTimeframe = tab === 'leaderboard';
  const showRanges = tab !== 'leaderboard';
  const showVerification = tab === 'following' || tab === 'liveTrades';
  const typeOptions =
    tab === 'following' ? TYPE_OPTIONS_FOLLOWING : TYPE_OPTIONS;
  const typeTitleKey =
    tab === 'leaderboard'
      ? 'social_leaderboard.shell.filters.section.asset_type'
      : 'social_leaderboard.shell.filters.section.type';
  const cohortOptions = cohortOptionsForTab(tab);

  const handleTypeChange = useCallback(
    (next: string) => onChange({ type: next as SocialFilterType }),
    [onChange],
  );
  const handleCohortChange = useCallback(
    (next: string) => onChange({ traderCohort: next as SocialTraderCohort }),
    [onChange],
  );
  const handleVerificationChange = useCallback(
    (next: string) =>
      onChange({ verification: next as SocialFilterVerification }),
    [onChange],
  );
  const handleTimeframeChange = useCallback(
    (next: string) => onChange({ timeframe: next as SocialFilterTimeframe }),
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

  const typeOptionObjects = useMemo(
    () =>
      typeOptions.map((id) => ({
        id,
        labelKey: TYPE_LABEL_KEY[id],
      })),
    [typeOptions],
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
  const verificationOptionObjects = useMemo(
    () =>
      VERIFICATION_OPTIONS.map((id) => ({
        id,
        labelKey: VERIFICATION_LABEL_KEY[id],
      })),
    [],
  );
  const timeframeOptions = useMemo(
    () =>
      TIMEFRAME_OPTIONS.map((id) => ({
        id,
        labelKey: TIMEFRAME_LABEL_KEY[id],
      })),
    [],
  );

  const applyButtonProps = useMemo(
    () => ({
      children: strings('social_leaderboard.shell.filters.apply'),
      onPress: onApply,
      size: ButtonSize.Lg,
      testID: SocialFiltersBottomSheetSelectorsIDs.APPLY,
    }),
    [onApply],
  );

  const resetButtonProps = useMemo(
    () => ({
      children: strings('social_leaderboard.shell.filters.reset'),
      onPress: onReset,
      size: ButtonSize.Lg,
      testID: SocialFiltersBottomSheetSelectorsIDs.RESET,
    }),
    [onReset],
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
                    titleKey={typeTitleKey}
                    options={typeOptionObjects}
                    value={draft.type}
                    onChange={handleTypeChange}
                    testID="social-filters-type"
                  />

                  {showVerification ? (
                    <FilterChipSection<SocialFilterVerification>
                      titleKey="social_leaderboard.shell.filters.section.verification"
                      options={verificationOptionObjects}
                      value={draft.verification}
                      onChange={handleVerificationChange}
                      testID="social-filters-verification"
                    />
                  ) : null}

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

              <BottomSheetFooter
                buttonsAlignment={ButtonsAlignment.Horizontal}
                secondaryButtonProps={resetButtonProps}
                primaryButtonProps={applyButtonProps}
              />
            </BottomSheet>
          </Box>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </Modal>
  );
};

export default SocialFiltersBottomSheet;
