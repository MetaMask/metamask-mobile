// Third party dependencies.
import React, { useEffect, useRef } from 'react';
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

  // Force layout measurement using requestAnimationFrame
  useEffect(() => {
    const forceLayout = () => {
      if (viewRef.current && onLayout) {
        viewRef.current.measure((x, y, width, height, _pageX, _pageY) => {
          if (width > 0) {
            const fakeLayoutEvent = {
              nativeEvent: {
                layout: { x, y, width, height },
              },
            } as Parameters<NonNullable<typeof onLayout>>[0];
            onLayout(fakeLayoutEvent);
          }
        });
      }
    };

    // Use requestAnimationFrame instead of setTimeout
    const frame = requestAnimationFrame(forceLayout);
    return () => cancelAnimationFrame(frame);
  }, [label, onLayout]);

  return (
    <View ref={viewRef} onLayout={onLayout} style={tw.style('flex-shrink-0')}>
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
