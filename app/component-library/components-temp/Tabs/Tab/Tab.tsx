// Third party dependencies.
import React, { useRef, useCallback } from 'react';
import { Pressable, View } from 'react-native';

// External dependencies.
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Text,
  TextVariant,
  FontWeight,
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import Icon, { IconSize, IconColor } from '../../../components/Icons/Icon';

// Internal dependencies.
import { TabProps } from './Tab.types';

const Tab: React.FC<TabProps> = ({
  label,
  iconName,
  isActive,
  isDisabled = false,
  onPress,
  testID,
  onLayout,
  ...pressableProps
}) => {
  const tw = useTailwind();
  const viewRef = useRef<View>(null);

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
      ref={viewRef}
      onLayout={handleOnLayout}
      style={tw.style('flex-shrink-0')}
    >
      <Pressable
        style={tw.style(
          'px-0 py-1 flex-col items-center justify-center relative',
          isDisabled && 'opacity-50',
        )}
        onPress={isDisabled ? undefined : onPress}
        disabled={isDisabled}
        testID={testID}
        {...pressableProps}
      >
        {iconName ? (
          // Icon mode: simple column stack, no layout-shift trick needed
          <Box
            twClassName="mb-1"
            flexDirection={BoxFlexDirection.Column}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
          >
            <Icon
              name={iconName}
              size={IconSize.Lg}
              color={
                isDisabled
                  ? IconColor.Muted
                  : isActive
                    ? IconColor.Default
                    : IconColor.Alternative
              }
              style={tw.style('mb-1')}
            />
            <Text
              variant={TextVariant.BodySm}
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
            >
              {label}
            </Text>
          </Box>
        ) : (
          // No icon: use hidden/visible text trick to prevent layout shift on bold toggle
          <>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              numberOfLines={1}
              style={tw.style('opacity-0')}
            >
              {label}
            </Text>
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
              style={tw.style(
                'absolute inset-0 flex items-center justify-center',
              )}
            >
              {label}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
};

export default Tab;
