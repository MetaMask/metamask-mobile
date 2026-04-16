import React, { memo, useCallback } from 'react';
import { Pressable, ScrollView } from 'react-native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  PREDICT_CHIP_LIST_TEST_IDS,
  getPredictChipTestId,
  getPredictChipLabelTestId,
} from './PredictChipList.testIds';
import type { PredictChipListProps } from './PredictChipList.types';

const PredictChipList: React.FC<PredictChipListProps> = ({
  chips,
  activeChipKey,
  onChipSelect,
  testID = PREDICT_CHIP_LIST_TEST_IDS.CONTAINER,
}) => {
  const tw = useTailwind();

  const handlePress = useCallback(
    (key: string) => {
      onChipSelect(key);
    },
    [onChipSelect],
  );

  if (chips.length === 0) {
    return null;
  }

  return (
    <Box testID={testID} twClassName="pt-3 pb-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw.style('px-4 gap-2')}
      >
        {chips.map((chip) => {
          const isActive = chip.key === activeChipKey;
          return (
            <Pressable
              key={chip.key}
              onPress={() => handlePress(chip.key)}
              style={tw.style(
                'rounded-xl px-4 py-2',
                isActive ? 'bg-icon-default' : 'bg-muted',
              )}
              testID={getPredictChipTestId(chip.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={
                  isActive ? TextColor.InfoInverse : TextColor.TextAlternative
                }
                testID={getPredictChipLabelTestId(chip.key)}
              >
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Box>
  );
};

export default memo(PredictChipList);
