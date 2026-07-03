import React from 'react';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { PredictHomeSelectorsIDs } from '../../../../Predict.testIds';

interface PredictCategoriesSectionProps {
  testID?: string;
}

/**
 * Placeholder for the Predict home "Categories" tiles section.
 * Replaced by the real section in a later ticket; the shell composes it as-is.
 */
const PredictCategoriesSection: React.FC<PredictCategoriesSectionProps> = ({
  testID = PredictHomeSelectorsIDs.CATEGORIES_SECTION,
}) => (
  <Box
    testID={testID}
    twClassName="my-2 items-center justify-center rounded-xl bg-muted py-8 px-4"
  >
    <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
      {strings('predict.home.categories_placeholder')}
    </Text>
  </Box>
);

export default PredictCategoriesSection;
