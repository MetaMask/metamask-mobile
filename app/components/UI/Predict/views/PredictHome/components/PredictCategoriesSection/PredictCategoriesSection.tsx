import React, { useCallback } from 'react';
import {
  Box,
  IconName,
  MainActionButton,
  SectionHeader,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../../core/NavigationService/types';
import { strings } from '../../../../../../../../locales/i18n';
import Routes from '../../../../../../../constants/navigation/Routes';
import Engine from '../../../../../../../core/Engine';
import { PredictEventValues } from '../../../../constants/eventNames';
import {
  PREDICT_HOME_CATEGORIES,
  type PredictHomeCategory,
} from './categories';
import { PREDICT_CATEGORIES_SECTION_TEST_IDS } from './PredictCategoriesSection.testIds';

interface PredictCategoriesSectionProps {
  testID?: string;
}

/**
 * Predict home "Categories" section (PRED-834).
 *
 * A static row of large destination tiles (Politics / Sports / Crypto). Each
 * tile deep-links into the generic `PredictFeedView` route for its `feedId` and
 * fires both `PREDICT_CATEGORY_CLICKED` (legacy, for backward compatibility)
 * and `PREDICT_HOME_SECTION_INTERACTION` (`action_type: clicked`, consistent
 * with other home sections). This section has no market fetch and is always
 * rendered.
 */
const PredictCategoriesSection: React.FC<PredictCategoriesSectionProps> = ({
  testID = PREDICT_CATEGORIES_SECTION_TEST_IDS.SECTION,
}) => {
  const navigation = useNavigation<AppNavigationProp>();

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

      <Box twClassName="flex-row gap-3">
        {PREDICT_HOME_CATEGORIES.map((category) => (
          <MainActionButton
            key={category.id}
            testID={`${PREDICT_CATEGORIES_SECTION_TEST_IDS.TILE_PREFIX}-${category.id}`}
            onPress={() => handlePress(category)}
            accessibilityLabel={strings(category.titleKey)}
            iconName={category.iconName as IconName}
            label={strings(category.titleKey)}
            twClassName="flex-1"
          />
        ))}
      </Box>
    </Box>
  );
};

export default PredictCategoriesSection;
