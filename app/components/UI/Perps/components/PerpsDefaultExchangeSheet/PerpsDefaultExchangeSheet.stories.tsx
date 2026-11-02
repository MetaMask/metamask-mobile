import React, { useState } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import PerpsDefaultExchangeSheet from './PerpsDefaultExchangeSheet';
import {
  PERPS_DEFAULT_EXCHANGE_STORY_OPTIONS,
  PERPS_DEFAULT_EXCHANGE_STORY_SELECTED_ID,
} from './PerpsDefaultExchangeSheet.constants';

const PerpsDefaultExchangeSheetMeta = {
  title: 'Perps / PerpsDefaultExchangeSheet',
  component: PerpsDefaultExchangeSheet,
  parameters: {
    notes:
      'Default exchange sheet. Hyperliquid starts selected. Save keeps the choice the next time you open the sheet.',
  },
};

export default PerpsDefaultExchangeSheetMeta;

const DefaultExchangeStory = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [selectedOptionId, setSelectedOptionId] = useState(
    PERPS_DEFAULT_EXCHANGE_STORY_SELECTED_ID,
  );

  return (
    // Temporary: fill the story canvas, which ends at the Storybook bar.
    // A window-height box drops the sheet underneath that bar.
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName="w-full flex-1"
    >
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Md}
        onPress={() => setIsVisible(true)}
      >
        Open default exchange
      </Button>
      <PerpsDefaultExchangeSheet
        isVisible={isVisible}
        options={PERPS_DEFAULT_EXCHANGE_STORY_OPTIONS}
        selectedOptionId={selectedOptionId}
        saveButtonBottomSpacing={16}
        onClose={() => setIsVisible(false)}
        onSave={(optionId) => {
          setSelectedOptionId(optionId);
          setIsVisible(false);
        }}
      />
    </Box>
  );
};

export const Default = {
  render: DefaultExchangeStory,
};
