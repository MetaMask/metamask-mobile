import React, { useCallback, useMemo } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
  SectionHeader,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import Routes from '../../../../../../../constants/navigation/Routes';
import Engine from '../../../../../../../core/Engine';
import { Skeleton } from '../../../../../../../component-library/components-temp/Skeleton';
import { PredictEventValues } from '../../../../constants/eventNames';
import { resolvePredictFeedDynamicFilterConfig } from '../../../../constants/feedConfig';
import { usePredictFilterOptions } from '../../../../hooks/usePredictFilterOptions';
import type {
  PredictFilterOption,
  PredictFilterOptionsParams,
} from '../../../../types';
import type {
  PredictFeedRouteParams,
  PredictNavigationParamList,
} from '../../../../types/navigation';
import { PredictHomeSelectorsIDs } from '../../../../Predict.testIds';

/**
 * Max number of filter chips rendered on the home section. The home rail shows
 * a compact prefix of the same ordered list as the Trending feed.
 */
const POPULAR_TODAY_FILTER_LIMIT = 10;
const SKELETON_COUNT = 8;
const DEFAULT_CHIP_ROW_COUNT = 2;

/**
 * Derive the section's filter-options params from the canonical `trending` feed
 * registry so there is a single source of truth. Crucially, we do NOT pass
 * a top-level `limit` here: that keeps the React Query cache key identical to
 * the full feed's `usePredictFilterOptions` call (which omits `limit`), so the
 * home section and the feed share the same cached related-tags request instead
 * of firing two. The display cap is applied client-side via
 * `POPULAR_TODAY_FILTER_LIMIT` when slicing the returned options.
 */
const POPULAR_TODAY_FILTER_PARAMS: PredictFilterOptionsParams = (() => {
  const dynamicConfig = resolvePredictFeedDynamicFilterConfig('trending');

  return {
    source: dynamicConfig?.source ?? 'related-tags',
    baseTagSlug: dynamicConfig?.baseTagSlug,
    baseParams: dynamicConfig?.baseParams,
    limit: dynamicConfig?.limit,
  };
})();

export const PREDICT_POPULAR_TODAY_SECTION_TEST_IDS = {
  SECTION: PredictHomeSelectorsIDs.POPULAR_TODAY_SECTION,
  HEADER: 'predict-home-popular-today-header',
  CHIP_PREFIX: 'predict-home-popular-today-chip',
  ROW_PREFIX: 'predict-home-popular-today-row',
  SKELETON_PREFIX: 'predict-home-popular-today-skeleton',
} as const;

const normalizeRowCount = (rowCount: number) =>
  Math.max(1, Math.floor(rowCount));

const splitIntoRows = <Item,>(items: Item[], rowCount: number): Item[][] => {
  if (items.length === 0) {
    return [];
  }

  const normalizedRowCount = normalizeRowCount(rowCount);
  const rows: Item[][] = [];
  let start = 0;

  for (let rowIndex = 0; rowIndex < normalizedRowCount; rowIndex++) {
    const remainingItems = items.length - start;
    const remainingRows = normalizedRowCount - rowIndex;
    const rowSize = Math.ceil(remainingItems / remainingRows);
    const row = items.slice(start, start + rowSize);

    if (row.length > 0) {
      rows.push(row);
    }

    start += rowSize;
  }

  return rows;
};

interface PredictPopularTodaySectionProps {
  testID?: string;
  rowCount?: number;
}

/**
 * Predict home "Popular today" tag rail (PRED-917).
 *
 * Uses the same related-tag source as the Trending feed. The header opens the
 * all-up Trending feed, while each chip opens that feed with the selected
 * related-tag filter preselected.
 */
const PredictPopularTodaySection: React.FC<PredictPopularTodaySectionProps> = ({
  testID = PREDICT_POPULAR_TODAY_SECTION_TEST_IDS.SECTION,
  rowCount = DEFAULT_CHIP_ROW_COUNT,
}) => {
  const tw = useTailwind();
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { filterOptions, isLoading } = usePredictFilterOptions(
    POPULAR_TODAY_FILTER_PARAMS,
  );

  const chips = useMemo(
    () =>
      filterOptions.slice(0, POPULAR_TODAY_FILTER_LIMIT).map((option) => ({
        key: option.id,
        label: option.label,
        option,
      })),
    [filterOptions],
  );
  const chipRows = useMemo(
    () => splitIntoRows(chips, rowCount),
    [chips, rowCount],
  );
  const skeletonRows = useMemo(
    () =>
      splitIntoRows(
        Array.from({ length: SKELETON_COUNT }, (_, index) => index),
        rowCount,
      ),
    [rowCount],
  );

  const navigateToTrending = useCallback(
    (initialFilterId?: string) => {
      const params: PredictFeedRouteParams = {
        feedId: 'trending',
        entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
        ...(initialFilterId ? { initialFilterId } : {}),
      };

      navigation.navigate(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.FEED,
        params,
      });
    },
    [navigation],
  );

  const handleSeeAll = useCallback(() => {
    Engine.context.PredictController.trackHomeSectionInteraction({
      sectionId: PredictEventValues.SECTION_ID.POPULAR_TODAY,
      actionType: PredictEventValues.ACTION_TYPE.SEE_ALL,
      entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
    });
    navigateToTrending();
  }, [navigateToTrending]);

  const handleChipPress = useCallback(
    (option: PredictFilterOption) => {
      Engine.context.PredictController.trackHomeSectionInteraction({
        sectionId: PredictEventValues.SECTION_ID.POPULAR_TODAY,
        actionType: PredictEventValues.ACTION_TYPE.CLICKED,
        // All Popular Today chips come from usePredictFilterOptions (related-tags
        // API), which are dynamic by definition — there are no static variants.
        filterId: option.id,
        isDynamicFilter: true,
        entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
      });
      navigateToTrending(option.id);
    },
    [navigateToTrending],
  );

  if (!isLoading && chips.length === 0) {
    return null;
  }

  return (
    <Box testID={testID} twClassName="my-2">
      <SectionHeader
        testID={PREDICT_POPULAR_TODAY_SECTION_TEST_IDS.HEADER}
        title={strings('predict.feed.popular_today')}
        isInteractive
        onPress={handleSeeAll}
        twClassName="px-0 pt-0 mb-2"
      />

      {isLoading ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-1')}
        >
          <Box twClassName="gap-2">
            {skeletonRows.map((row, rowIndex) => (
              <Box
                key={`popular-today-skeleton-row-${rowIndex}`}
                twClassName="flex-row gap-2"
              >
                {row.map((index) => (
                  <Skeleton
                    key={`popular-today-skeleton-${index}`}
                    width={104}
                    height={40}
                    style={tw.style('rounded-xl')}
                    testID={`${PREDICT_POPULAR_TODAY_SECTION_TEST_IDS.SKELETON_PREFIX}-${index}`}
                  />
                ))}
              </Box>
            ))}
          </Box>
        </ScrollView>
      ) : null}

      {!isLoading && chips.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-1')}
        >
          <Box twClassName="gap-2">
            {chipRows.map((row, rowIndex) => (
              <Box
                key={`popular-today-row-${rowIndex}`}
                testID={`${PREDICT_POPULAR_TODAY_SECTION_TEST_IDS.ROW_PREFIX}-${rowIndex}`}
                twClassName="flex-row gap-2"
              >
                {row.map(({ key, label, option }) => (
                  <Pressable
                    key={key}
                    testID={`${PREDICT_POPULAR_TODAY_SECTION_TEST_IDS.CHIP_PREFIX}-${key}`}
                    onPress={() => handleChipPress(option)}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    style={tw.style('rounded-xl bg-muted px-4 py-2')}
                  >
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                      fontWeight={FontWeight.Medium}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </Box>
            ))}
          </Box>
        </ScrollView>
      ) : null}
    </Box>
  );
};

export default PredictPopularTodaySection;
