// Third party dependencies.
import React, { useCallback, useState } from 'react';
import { View, LayoutChangeEvent } from 'react-native';

// External dependencies.
import {
  Box,
  Text,
  ButtonIcon,
  ButtonIconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Internal dependencies.
import { HeaderBaseProps, HeaderBaseVariant } from './HeaderBase.types';
import {
  HEADERBASE_TEST_ID,
  HEADERBASE_TITLE_TEST_ID,
  HEADERBASE_VARIANT_TEXT_VARIANTS,
} from './HeaderBase.constants';

/**
 * HeaderBase is a flexible header component that supports optional
 * start and end accessories with configurable alignment and text variants.
 */
const HeaderBase: React.FC<HeaderBaseProps> = ({
  children,
  style,
  startAccessory,
  endAccessory,
  startButtonIconProps,
  endButtonIconProps,
  includesTopInset = false,
  variant = HeaderBaseVariant.Compact,
  startAccessoryWrapperProps,
  endAccessoryWrapperProps,
  testID = HEADERBASE_TEST_ID,
  twClassName,
  ...viewProps
}) => {
  const tw = useTailwind();
  const insets = useSafeAreaInsets();

  const [startAccessoryWidth, setStartAccessoryWidth] = useState(0);
  const [endAccessoryWidth, setEndAccessoryWidth] = useState(0);

  const handleStartAccessoryLayout = useCallback((e: LayoutChangeEvent) => {
    setStartAccessoryWidth(e.nativeEvent.layout.width);
  }, []);

  const handleEndAccessoryLayout = useCallback((e: LayoutChangeEvent) => {
    setEndAccessoryWidth(e.nativeEvent.layout.width);
  }, []);

  // Determine alignment and text variant based on variant prop
  const isLeftAligned = variant === HeaderBaseVariant.Display;
  const textVariant = HEADERBASE_VARIANT_TEXT_VARIANTS[variant];

  // Determine what to render for start/end
  const hasStartContent = startAccessory || startButtonIconProps;
  const hasEndContent =
    endAccessory || (endButtonIconProps && endButtonIconProps.length > 0);
  const hasAnyAccessory = hasStartContent || hasEndContent;

  // For Compact: render both wrappers if any accessory exists (for centering)
  // For Display: only render wrappers if their respective accessory exists
  const shouldRenderStartWrapper = isLeftAligned
    ? !!hasStartContent
    : hasAnyAccessory;
  const shouldRenderEndWrapper = isLeftAligned
    ? !!hasEndContent
    : hasAnyAccessory;

  // Calculate equal width for both accessory wrappers to ensure title stays centered
  // Only needed for Compact variant
  const accessoryWrapperWidth =
    !isLeftAligned &&
    hasAnyAccessory &&
    (startAccessoryWidth || endAccessoryWidth)
      ? Math.max(startAccessoryWidth, endAccessoryWidth)
      : undefined;

  const renderStartContent = () => {
    if (startAccessory) {
      return startAccessory;
    }
    if (startButtonIconProps) {
      return <ButtonIcon size={ButtonIconSize.Md} {...startButtonIconProps} />;
    }
    return null;
  };

  const renderEndContent = () => {
    if (endAccessory) {
      return endAccessory;
    }
    if (endButtonIconProps && endButtonIconProps.length > 0) {
      // Reverse the array so first item appears rightmost
      // Use original index (before reversal) for stable React keys
      const reversedProps = endButtonIconProps
        .map((props, originalIndex) => ({ props, originalIndex }))
        .reverse();
      return reversedProps.map(({ props, originalIndex }) => (
        <ButtonIcon
          key={`end-button-icon-${originalIndex}`}
          size={ButtonIconSize.Md}
          {...props}
        />
      ));
    }
    return null;
  };

  // Check if we have multiple end buttons for layout styling
  const hasMultipleEndButtons =
    !endAccessory && endButtonIconProps && endButtonIconProps.length > 1;

  // Merge default styles with passed-in twClassName
  // Compact: fixed height, Display: content-based with no default styles
  const baseStyles = isLeftAligned
    ? 'flex-row items-center gap-4'
    : 'flex-row items-center gap-4 h-14';
  const resolvedTwClassName = twClassName
    ? `${baseStyles} ${twClassName}`
    : baseStyles;

  // Title classes based on variant
  const titleWrapperClass = isLeftAligned
    ? 'flex-1 items-start'
    : 'flex-1 items-center';

  return (
    <View
      style={[
        tw.style(resolvedTwClassName),
        includesTopInset && { marginTop: insets.top },
        style,
      ]}
      testID={testID}
      {...viewProps}
    >
      {/* Start accessory */}
      {shouldRenderStartWrapper && (
        <View
          style={
            accessoryWrapperWidth
              ? tw.style('items-start', { width: accessoryWrapperWidth })
              : undefined
          }
          {...startAccessoryWrapperProps}
        >
          <View onLayout={handleStartAccessoryLayout}>
            {renderStartContent()}
          </View>
        </View>
      )}

      {/* Title */}
      <Box twClassName={titleWrapperClass}>
        {typeof children === 'string' ? (
          <Text
            variant={textVariant}
            testID={HEADERBASE_TITLE_TEST_ID}
            style={isLeftAligned ? undefined : tw.style('text-center')}
          >
            {children}
          </Text>
        ) : (
          children
        )}
      </Box>

      {/* End accessory */}
      {shouldRenderEndWrapper && (
        <View
          style={
            accessoryWrapperWidth
              ? tw.style('items-end', { width: accessoryWrapperWidth })
              : undefined
          }
          {...endAccessoryWrapperProps}
        >
          <View
            onLayout={handleEndAccessoryLayout}
            style={
              hasMultipleEndButtons ? tw.style('flex-row gap-2') : undefined
            }
          >
            {renderEndContent()}
          </View>
        </View>
      )}
    </View>
  );
};

export default HeaderBase;
