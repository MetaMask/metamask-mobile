import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { PredictPositionsViewSelectorsIDs } from '../../Predict.testIds';

const PredictPositionsView = () => {
  const tw = useTailwind();

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      testID={PredictPositionsViewSelectorsIDs.CONTAINER}
    >
      <Box twClassName="flex-1 items-center justify-center">
        <Text variant={TextVariant.HeadingMd}>
          {strings('predict.tabs.positions')}
        </Text>
      </Box>
    </SafeAreaView>
  );
};

export default PredictPositionsView;
