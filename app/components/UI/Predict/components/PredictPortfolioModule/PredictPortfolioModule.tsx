import React from 'react';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { PredictHomeSelectorsIDs } from '../../Predict.testIds';

interface PredictPortfolioModuleProps {
  testID?: string;
}

/**
 * Placeholder for the Predict home portfolio module (PRED-835).
 * Replaced by the real module in a later ticket; the shell composes it as-is.
 */
const PredictPortfolioModule: React.FC<PredictPortfolioModuleProps> = ({
  testID = PredictHomeSelectorsIDs.PORTFOLIO_MODULE,
}) => (
  <Box
    testID={testID}
    twClassName="my-2 items-center justify-center rounded-xl bg-muted py-8 px-4"
  >
    <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
      {strings('predict.home.portfolio_module_placeholder')}
    </Text>
  </Box>
);

export default PredictPortfolioModule;
