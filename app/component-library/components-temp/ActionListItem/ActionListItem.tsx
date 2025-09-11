// Third party dependencies
import React, { useCallback } from 'react';
import { Pressable } from 'react-native';

// External dependencies
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconSize,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

// Internal dependencies
import { ActionListItemProps } from './ActionListItem.types';

const ActionListItem: React.FC<ActionListItemProps> = ({
  label,
  description,
  startAccessory,
  endAccessory,
  iconName,
  labelTextProps,
  descriptionTextProps,
  iconProps,
  isDisabled = false,
  rounded = false,
  ...pressableProps
}) => {
  const tw = useTailwind();

  // Render label based on type
  const renderLabel = () => {
    if (typeof label === 'string') {
      return (
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          {...labelTextProps}
        >
          {label}
        </Text>
      );
    }
    return label;
  };

  // Render description based on type
  const renderDescription = () => {
    if (!description) return null;

    if (typeof description === 'string') {
      return (
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          {...descriptionTextProps}
        >
          {description}
        </Text>
      );
    }
    return description;
  };

  // Render start content (either startAccessory or icon)
  const renderStartContent = () => {
    if (startAccessory) {
      return startAccessory;
    }

    if (iconName) {
      return (
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="h-6"
        >
          <Icon name={iconName} size={IconSize.Md} {...iconProps} />
        </Box>
      );
    }

    return null;
  };

  const getStyle = useCallback(
    ({ pressed }: { pressed: boolean }) =>
      tw.style(
        'bg-default px-4 py-3',
        pressed && !isDisabled && 'bg-default-pressed',
        isDisabled && 'opacity-50',
        rounded && 'rounded-lg',
      ),
    [tw, isDisabled, rounded],
  );

  return (
    <Pressable style={getStyle} disabled={isDisabled} {...pressableProps}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        gap={4}
      >
        {/* Left side content (start accessory/icon + label/description) */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Start}
          twClassName="flex-1"
          gap={4}
        >
          {/* Start accessory or icon */}
          {renderStartContent()}

          {/* Label and description container */}
          <Box twClassName="flex-1">
            {renderLabel()}
            {renderDescription()}
          </Box>
        </Box>

        {/* End accessory */}
        {endAccessory && <Box>{endAccessory}</Box>}
      </Box>
    </Pressable>
  );
};

export default ActionListItem;
