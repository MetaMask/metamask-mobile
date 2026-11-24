import React from 'react';
import { Pressable, ScrollView } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

export interface PillOption {
  key: string;
  name: string;
  /** Optional leading icon rendered before the label. */
  iconName?: IconName;
  iconOnly?: boolean;
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
    <Box>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        testID={`${testIdPrefix}-pills`}
        contentContainerStyle={tw.style('px-4 py-3')}
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
                accessibilityLabel={pill.iconOnly ? pill.name : undefined}
                onPress={() => onSelect(pill.key)}
                testID={`${testIdPrefix}-pill-${pill.key}`}
                style={tw.style(
                  'rounded-full px-[12px] py-2',
                  isSelected ? 'bg-icon-default' : 'bg-muted',
                )}
              >
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  twClassName={pill.iconOnly ? 'h-6 gap-0' : 'gap-1'}
                >
                  {pill.iconName ? (
                    <Icon
                      name={pill.iconName}
                      size={IconSize.Sm}
                      color={
                        isSelected
                          ? IconColor.InfoInverse
                          : IconColor.IconDefault
                      }
                    />
                  ) : null}
                  {pill.iconOnly ? null : (
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                      color={
                        isSelected
                          ? TextColor.InfoInverse
                          : TextColor.TextDefault
                      }
                      testID={`${testIdPrefix}-pill-label-${pill.key}`}
                    >
                      {pill.name}
                    </Text>
                  )}
                </Box>
              </Pressable>
            );
          })}
        </Box>
      </ScrollView>
    </Box>
  );
};

export default PillRow;
