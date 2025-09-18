// Third party dependencies.
import React, { useRef, useCallback } from 'react';
import { Pressable, View } from 'react-native';

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
  onLayout,
  ...pressableProps
}) => {
  const tw = useTailwind();
  const viewRef = useRef<View>(null);

  // Tab rendering optimized

  // Simple callback ref to store the view reference
  const handleViewRef = useCallback((view: View | null) => {
    // Store ref for other uses
    if (viewRef.current !== view) {
      Object.assign(viewRef, { current: view });
    }
  }, []);

  const handleOnLayout = useCallback(
    (layoutEvent: Parameters<NonNullable<typeof onLayout>>[0]) => {
      if (onLayout) {
        onLayout(layoutEvent);
      }
    },
    [onLayout],
  );

  return (
    <View
      ref={handleViewRef}
      onLayout={handleOnLayout}
      style={tw.style('flex-shrink-0')}
    >
      <Pressable
        style={tw.style(
          'px-0 py-1 flex-row items-center justify-center relative',
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
          twClassName={isActive ? 'text-default' : 'text-alternative'}
          numberOfLines={1}
          style={tw.style('absolute inset-0 flex items-center justify-center')}
        >
          {label}
        </Text>
      </Pressable>
    </View>
  );
};

export default Tab;
