import React, { useCallback, useState } from 'react';
import { Pressable, type TextLayoutEvent } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  RadioButton,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { PerpsSelectionOptionCardProps } from './PerpsSelectionBottomSheet.types';

/**
 * Selectable card used by `PerpsSelectionBottomSheet`.
 *
 * The radio aligns to the top when the text spans more than two lines
 * (title plus a multi-line description) and centers otherwise.
 */
const PerpsSelectionOptionCard: React.FC<PerpsSelectionOptionCardProps> = ({
  option,
  isSelected,
  onPress,
  testID,
}) => {
  const tw = useTailwind();
  const [descriptionLineCount, setDescriptionLineCount] = useState(0);

  const handleDescriptionLayout = useCallback((event: TextLayoutEvent) => {
    setDescriptionLineCount(event.nativeEvent.lines.length);
  }, []);

  const {
    title,
    tag,
    description,
    startAccessory,
    icon,
    isDisabled = false,
  } = option;
  const hasMultiLineText = descriptionLineCount > 1;
  const accessibilityLabel = [title, tag, description?.replace(/\n/g, ', ')]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      testID={testID}
      // The 1px border is always rendered (transparent when unselected) and
      // the padding is reduced by the same amount so selecting never shifts
      // the content.
      style={({ pressed }) =>
        tw.style(
          'flex-row gap-4 rounded-2xl border bg-muted p-[15px]',
          hasMultiLineText ? 'items-start' : 'items-center',
          isSelected ? 'border-default' : 'border-transparent',
          pressed && 'bg-pressed',
          isDisabled && 'opacity-50',
        )
      }
    >
      {startAccessory ? (
        <Box
          accessible={false}
          twClassName="h-10 w-10 overflow-hidden rounded-xl"
        >
          {startAccessory}
        </Box>
      ) : (
        icon
      )}
      <Box accessible={false} twClassName="flex-1">
        <Box
          accessible={false}
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            numberOfLines={1}
            twClassName="shrink"
          >
            {title}
          </Text>
          {tag ? <Tag severity={TagSeverity.Neutral}>{tag}</Tag> : null}
        </Box>
        {description ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            onTextLayout={handleDescriptionLayout}
          >
            {description}
          </Text>
        ) : null}
      </Box>
      <RadioButton
        isChecked={isSelected}
        isDisabled={isDisabled}
        onPress={onPress}
        touchableOpacityProps={{
          // The card is the radio. This control only draws the indicator.
          accessible: false,
          accessibilityElementsHidden: true,
          importantForAccessibility: 'no-hide-descendants',
          testID: testID ? `${testID}-radio` : undefined,
        }}
      />
    </Pressable>
  );
};

export default PerpsSelectionOptionCard;
