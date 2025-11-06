// Third party dependencies.
import React, { useRef, useEffect } from 'react';
import { Pressable, Animated } from 'react-native';

// External dependencies.
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { AnimationDuration } from '../../../constants/animation.constants';

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
  const scaleAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Skip animation on initial mount - just set the value
    if (isInitialMount.current) {
      isInitialMount.current = false;
      scaleAnim.setValue(isActive && !isDisabled ? 1 : 0);
      return;
    }

    // Animate on subsequent changes
    Animated.timing(scaleAnim, {
      toValue: isActive && !isDisabled ? 1 : 0,
      duration: AnimationDuration.Fast,
      useNativeDriver: true,
    }).start();
  }, [isActive, isDisabled, scaleAnim]);

  return (
    <Pressable
      style={tw.style(
        'flex-shrink-0 px-0 py-1 flex-row items-center justify-center relative',
        isDisabled && 'opacity-50',
      )}
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

      {/* Animated underline */}
      <Animated.View
        style={[
          tw.style('absolute bottom-0 left-0 right-0 h-0.5 bg-icon-default'),
          {
            transform: [{ scaleX: scaleAnim }],
          },
        ]}
      />
    </Pressable>
  );
};

export default Tab;
