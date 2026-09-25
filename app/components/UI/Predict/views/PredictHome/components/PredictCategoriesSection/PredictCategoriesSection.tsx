import React, { useCallback, useMemo, useSyncExternalStore } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useSelector } from 'react-redux';
import {
  Box,
  FontWeight,
  SectionHeader,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  default as Icon,
  IconColor,
  IconSize,
} from '../../../../../../../component-library/components/Icons/Icon';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../../core/NavigationService/types';
import I18n, {
  I18nEvents,
  strings,
} from '../../../../../../../../locales/i18n';
import Routes from '../../../../../../../constants/navigation/Routes';
import Engine from '../../../../../../../core/Engine';
import { PredictEventValues } from '../../../../constants/eventNames';
import { selectPredictHomeCategoriesConfig } from '../../../../selectors/featureFlags';
import {
  resolvePredictHomeCategories,
  resolvePredictHomeCategoryDisplayTitle,
  type PredictHomeCategory,
} from './categories';
import { PREDICT_CATEGORIES_SECTION_TEST_IDS } from './PredictCategoriesSection.testIds';

interface PredictCategoriesSectionProps {
  testID?: string;
}

// The home scroll content is padded `px-4`; the rail bleeds into that padding
// so tiles scroll edge-to-edge while the first tile still aligns with the
// section header.
const HOME_HORIZONTAL_PADDING = 16;
const TILE_GAP = 12;
// Tiles are sized so ~3.5 fit in the viewport: the partially visible fourth
// tile signals that the rail is horizontally scrollable.
const VISIBLE_TILE_COUNT = 3.5;
const MIN_TILE_WIDTH = 88;

export const getPredictCategoryTileWidth = (windowWidth: number): number =>
  Math.max(
    MIN_TILE_WIDTH,
    Math.floor(
      (windowWidth -
        HOME_HORIZONTAL_PADDING * 2 -
        TILE_GAP * Math.floor(VISIBLE_TILE_COUNT)) /
        VISIBLE_TILE_COUNT,
    ),
  );

/**
 * Predict home "Categories" section (PRED-834 / PRED-1226).
 *
 * A horizontally scrollable rail of square destination tiles whose order and
 * membership come from the `predictHomeCategories` LaunchDarkly flag (bundled
 * Politics / Sports / Crypto / Esports / Culture / Finance / Tech fallback).
 * Each tile deep-links into the generic `PredictFeedView` route for its
 * `feedId` and fires both `PREDICT_CATEGORY_CLICKED` (legacy, for backward
 * compatibility) and `PREDICT_HOME_SECTION_INTERACTION` (`action_type:
 * clicked`, consistent with other home sections) with `category_name` set to
 * the tile id. The header is intentionally non-interactive. This section has
 * no market fetch and is always rendered.
 */
const PredictCategoriesSection: React.FC<PredictCategoriesSectionProps> = ({
  testID = PREDICT_CATEGORIES_SECTION_TEST_IDS.SECTION,
}) => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { width: windowWidth } = useWindowDimensions();
  const categoriesConfig = useSelector(selectPredictHomeCategoriesConfig);
  const locale = useSyncExternalStore(
    (onStoreChange) => {
      I18nEvents.addListener('localeChanged', onStoreChange);
      return () => I18nEvents.removeListener('localeChanged', onStoreChange);
    },
    () => I18n.locale,
  );

  const categories = useMemo(
    () => resolvePredictHomeCategories(categoriesConfig),
    [categoriesConfig],
  );
  const tileWidth = getPredictCategoryTileWidth(windowWidth);

  const handlePress = useCallback(
    (category: PredictHomeCategory) => {
      // Fire legacy event for backward-compatibility with existing consumers,
      // alongside the consolidated home-section interaction event.
      Engine.context.PredictController.trackCategoryClicked({
        categoryName: category.id,
        entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
      });
      Engine.context.PredictController.trackHomeSectionInteraction({
        sectionId: PredictEventValues.SECTION_ID.CATEGORIES,
        actionType: PredictEventValues.ACTION_TYPE.CLICKED,
        categoryName: category.id,
        entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
      });

      navigation.navigate(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.FEED,
        params: {
          feedId: category.id,
          entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
        },
      });
    },
    [navigation],
  );

  return (
    <Box testID={testID}>
      <SectionHeader
        testID={PREDICT_CATEGORIES_SECTION_TEST_IDS.HEADER}
        title={strings('predict.home.categories_title')}
        twClassName="px-0 pt-0 mb-1"
      />

      <ScrollView
        testID={PREDICT_CATEGORIES_SECTION_TEST_IDS.CAROUSEL}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={tw.style('-mx-4')}
        contentContainerStyle={tw.style('px-4 gap-3')}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={`${category.id}-${locale}`}
            testID={`${PREDICT_CATEGORIES_SECTION_TEST_IDS.TILE_PREFIX}-${category.id}`}
            onPress={() => handlePress(category)}
            accessibilityRole="button"
            accessibilityLabel={resolvePredictHomeCategoryDisplayTitle(
              category,
            )}
            style={{ width: tileWidth }}
          >
            <Box twClassName="aspect-square items-center justify-center gap-2 rounded-xl bg-muted p-2">
              <Icon
                name={category.iconName}
                size={IconSize.Lg}
                color={IconColor.Default}
              />
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
                numberOfLines={1}
              >
                {resolvePredictHomeCategoryDisplayTitle(category)}
              </Text>
            </Box>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Box>
  );
};

export default PredictCategoriesSection;
