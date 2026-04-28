import React from 'react';
import { Pressable, ScrollView } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

export interface PillOption {
  key: string;
  name: string;
}

interface PillRowProps {
  pills: PillOption[];
  activeKey: string;
  onSelect: (key: string) => void;
  testIdPrefix?: string;
}

const PillRow: React.FC<PillRowProps> = ({
  pills,
  activeKey,
  onSelect,
  testIdPrefix = 'pill-row',
}) => {
  const tw = useTailwind();

  return (
    <Box twClassName="-mx-4 mb-3">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        testID={`${testIdPrefix}-pills`}
        contentContainerStyle={tw.style('px-4')}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-2"
        >
          {pills.map((pill) => {
            const isSelected = activeKey === pill.key;
            return (
              <Pressable
                key={pill.key}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => onSelect(pill.key)}
                testID={`${testIdPrefix}-pill-${pill.key}`}
                style={tw.style(
                  'rounded-xl px-4 py-2',
                  isSelected ? 'bg-icon-default' : 'bg-muted',
                )}
              >
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  color={
                    isSelected
                      ? TextColor.InfoInverse
                      : TextColor.TextAlternative
                  }
                  testID={`${testIdPrefix}-pill-label-${pill.key}`}
                >
                  {pill.name}
                </Text>
              </Pressable>
            );
          })}
        </Box>
      </ScrollView>
    </Box>
  );
};

export default PillRow;
