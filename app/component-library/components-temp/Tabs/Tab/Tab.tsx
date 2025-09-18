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
import { TabProps } from './Tab.types';

const Tab: React.FC<TabProps> = ({
  label,
  isActive,
  isDisabled = false,
  onPress,
  testID,
  ...pressableProps
}) => {
  const tw = useTailwind();

  return (
    <Pressable
      style={({ pressed }) =>
        tw.style(
          'px-0 py-1 flex-row items-center justify-center relative',
          pressed && !isDisabled && 'opacity-70',
        )
      }
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      testID={testID}
      {...pressableProps}
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
        fontWeight={
          isActive && !isDisabled ? FontWeight.Bold : FontWeight.Regular
        }
        twClassName={
          isDisabled
            ? 'text-muted'
            : isActive
            ? 'text-default'
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
