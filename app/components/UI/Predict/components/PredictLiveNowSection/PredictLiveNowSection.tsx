import React from 'react';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { PredictHomeSelectorsIDs } from '../../Predict.testIds';

interface PredictLiveNowSectionProps {
  testID?: string;
}

/**
 * Placeholder for the Predict home "Live now" carousel section.
 * Replaced by the real section in a later ticket; the shell composes it as-is.
 */
const PredictLiveNowSection: React.FC<PredictLiveNowSectionProps> = ({
  testID = PredictHomeSelectorsIDs.LIVE_NOW_SECTION,
}) => (
  <Box
    testID={testID}
    twClassName="my-2 items-center justify-center rounded-xl bg-muted py-8 px-4"
  >
    <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
      {strings('predict.home.live_now_placeholder')}
    </Text>
  </Box>
);

export default PredictLiveNowSection;
