import React, { useCallback } from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  FontWeight,
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
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { strings } from '../../../../../../../../locales/i18n';
import Routes from '../../../../../../../constants/navigation/Routes';
import Engine from '../../../../../../../core/Engine';
import SectionHeader from '../../../../../../../component-library/components-temp/SectionHeader';
import { PredictEventValues } from '../../../../constants/eventNames';
import type { PredictNavigationParamList } from '../../../../types/navigation';
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
 * fires a `PREDICT_CATEGORY_CLICKED` analytics event identifying the tile. This
 * section has no market fetch and is always rendered.
 */
const PredictCategoriesSection: React.FC<PredictCategoriesSectionProps> = ({
  testID = PREDICT_CATEGORIES_SECTION_TEST_IDS.SECTION,
}) => {
  const tw = useTailwind();
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();

  const handlePress = useCallback(
    (category: PredictHomeCategory) => {
      Engine.context.PredictController.trackCategoryClicked({
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
        twClassName="px-0 mb-2"
      />

      <Box twClassName="flex-row gap-3">
        {PREDICT_HOME_CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            testID={`${PREDICT_CATEGORIES_SECTION_TEST_IDS.TILE_PREFIX}-${category.id}`}
            onPress={() => handlePress(category)}
            accessibilityRole="button"
            accessibilityLabel={strings(category.titleKey)}
            style={tw.style('flex-1')}
          >
            <Box twClassName="items-center justify-center gap-2 rounded-xl bg-muted py-4 px-2">
              <Icon
                name={category.iconName}
                size={IconSize.Lg}
                color={IconColor.Default}
              />
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
              >
                {strings(category.titleKey)}
              </Text>
            </Box>
          </TouchableOpacity>
        ))}
      </Box>
    </Box>
  );
};

export default PredictCategoriesSection;
