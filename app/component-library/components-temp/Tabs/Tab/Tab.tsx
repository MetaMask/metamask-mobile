// Third party dependencies.
import React from 'react';
import { Pressable } from 'react-native';

// External dependencies.
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Text, TextVariant } from '@metamask/design-system-react-native';

// Internal dependencies.
import { TabProps } from '../Tabs.types';

const Tab: React.FC<TabProps> = ({
  label,
  isActive,
  onPress,
  style,
  textStyle,
  testID,
}) => {
  const tw = useTailwind();

  return (
    <Pressable
      style={({ pressed }) =>
        tw.style(
          'px-8 py-2 flex-row items-center justify-center min-w-0',
          pressed && 'opacity-70',
          style,
        )
      }
      onPress={onPress}
      testID={testID}
    >
      <Text
        variant={TextVariant.BodyMd}
        style={tw.style(
          isActive ? 'text-default font-medium' : 'text-alternative',
          textStyle,
        )}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
};

export default Tab;
