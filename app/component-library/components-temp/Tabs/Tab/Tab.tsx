// Third party dependencies.
import React from 'react';
import { Pressable } from 'react-native';

// External dependencies.
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';

// Internal dependencies.
import { TabProps } from '../Tabs.types';

const Tab: React.FC<TabProps> = ({
  label,
  isActive,
  disabled = false,
  onPress,
  testID,
}) => {
  const tw = useTailwind();

  return (
    <Pressable
      style={({ pressed }) =>
        tw.style(
          'px-0 py-2 flex-row items-center justify-center relative',
          pressed && !disabled && 'opacity-70',
        )
      }
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      testID={testID}
    >
      {/* Hidden bold text that determines layout size */}
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Bold}
        numberOfLines={1}
        style={tw.style('opacity-0')}
      >
        {label}
      </Text>

      {/* Visible text positioned absolutely over the hidden text */}
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={isActive ? FontWeight.Bold : FontWeight.Regular}
        twClassName={
          isActive
            ? 'text-default'
            : disabled
            ? 'text-muted'
            : 'text-alternative'
        }
        numberOfLines={1}
        style={tw.style('absolute inset-0 flex items-center justify-center')}
      >
        {label}
      </Text>
    </Pressable>
  );
};

export default Tab;
