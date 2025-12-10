// Third party dependencies.
import React, { useCallback, useState } from 'react';
import { View, LayoutChangeEvent } from 'react-native';

// External dependencies.
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextVariant,
  ButtonIcon,
  ButtonIconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Internal dependencies.
import { HeaderBaseProps } from './HeaderBase.types';
import { HeaderBaseTestIds } from './HeaderBase.constants';

/**
 * HeaderBase is a simple header component with center-aligned title
 * and optional start/end accessories.
 *
 * @example
 * ```tsx
 * <HeaderBase
 *   startButtonIconProps={{ iconName: IconName.ArrowLeft, onPress: handleBack }}
 *   endButtonIconProps={[
 *     { iconName: IconName.Search, onPress: handleSearch },
 *     { iconName: IconName.Close, onPress: handleClose },
 *   ]}
 * >
 *   Header Title
 * </HeaderBase>
 * ```
 */
const HeaderBase: React.FC<HeaderBaseProps> = ({
  children,
  startAccessory,
  endAccessory,
  startButtonIconProps,
  endButtonIconProps,
  includesTopInset = false,
  startAccessoryWrapperProps,
  endAccessoryWrapperProps,
  testID = HeaderBaseTestIds.CONTAINER,
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

  // Determine what to render for start/end
  const hasStartContent = startAccessory || startButtonIconProps;
  const hasEndContent = endAccessory || endButtonIconProps;
  const hasAnyAccessory = hasStartContent || hasEndContent;

  // Calculate equal width for both accessory wrappers to ensure title stays centered
  // Use max of both widths - if only one accessory exists, the other side gets
  // an invisible spacer of the same width to maintain centering
  const accessoryWrapperWidth =
    hasAnyAccessory && (startAccessoryWidth || endAccessoryWidth)
      ? Math.max(startAccessoryWidth, endAccessoryWidth)
      : undefined;

  // Render start content
  const renderStartContent = () => {
    if (startAccessory) {
      return startAccessory;
    }
    if (startButtonIconProps) {
      return <ButtonIcon size={ButtonIconSize.Md} {...startButtonIconProps} />;
    }
    return null;
  };

  // Render end content
  const renderEndContent = () => {
    if (endAccessory) {
      return endAccessory;
    }
    if (endButtonIconProps && endButtonIconProps.length > 0) {
      // Reverse the array so first item appears rightmost
      const reversedProps = [...endButtonIconProps].reverse();
      return (
        <Box flexDirection={BoxFlexDirection.Row} gap={2}>
          {reversedProps.map((props, index) => (
            <ButtonIcon
              key={`end-button-icon-${index}`}
              size={ButtonIconSize.Md}
              {...props}
            />
          ))}
        </Box>
      );
    }
    return null;
  };

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={4}
      style={includesTopInset ? { marginTop: insets.top } : undefined}
      testID={testID}
    >
      {/* Start accessory wrapper */}
      {hasAnyAccessory && (
        <View
          style={
            accessoryWrapperWidth ? { width: accessoryWrapperWidth } : undefined
          }
          testID={HeaderBaseTestIds.START_ACCESSORY}
          {...startAccessoryWrapperProps}
        >
          <View onLayout={handleStartAccessoryLayout}>
            {renderStartContent()}
          </View>
        </View>
      )}

      {/* Title wrapper - centered */}
      <Box twClassName="flex-1 items-center">
        {typeof children === 'string' ? (
          <Text
            variant={TextVariant.HeadingSm}
            testID={HeaderBaseTestIds.TITLE}
            style={tw.style('text-center')}
          >
            {children}
          </Text>
        ) : (
          children
        )}
      </Box>

      {/* End accessory wrapper */}
      {hasAnyAccessory && (
        <View
          style={
            accessoryWrapperWidth ? { width: accessoryWrapperWidth } : undefined
          }
          testID={HeaderBaseTestIds.END_ACCESSORY}
          {...endAccessoryWrapperProps}
        >
          <View onLayout={handleEndAccessoryLayout}>{renderEndContent()}</View>
        </View>
      )}
    </Box>
  );
};

export default HeaderBase;
