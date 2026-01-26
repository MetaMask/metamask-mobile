import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import Button, {
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import type { ButtonPrimaryProps } from '../../components/Buttons/Button/variants/ButtonPrimary/ButtonPrimary.types';

/**
 * StickyBottomBar Props
 */
export interface StickyBottomBarProps {
  /**
   * Array of button configurations (left to right)
   * Maximum 4 buttons recommended for mobile
   * Note: All buttons use ButtonVariants.Primary styling
   */
  buttons: ButtonPrimaryProps[];

  /**
   * Optional custom styles for the container
   */
  style?: StyleProp<ViewStyle>;

  /**
   * Optional test ID
   */
  testID?: string;
}

/**
 * StickyBottomBar Component
 */
export default function StickyBottomBar({
  buttons,
  style,
  testID = 'sticky-bottom-bar',
}: StickyBottomBarProps) {
  const tw = useTailwind();
  const insets = useSafeAreaInsets();

  // Don't render if no buttons
  if (!buttons || buttons.length === 0) {
    return null;
  }

  // Compute dynamic paddingBottom for SafeArea
  const containerStyle = tw.style(
    'absolute bottom-0 left-0 right-0 bg-default border-t border-muted pt-4 px-4',
    { paddingBottom: insets.bottom + 16 },
  );

  return (
    <Box
      // @ts-expect-error - React Native type conflict between @types/react-native and react-native packages
      style={style ? [containerStyle, style] : containerStyle}
      testID={testID}
    >
      <Box twClassName="flex-row gap-3 items-stretch justify-between">
        {buttons.map((buttonProps, index) => (
          <Box key={index} twClassName="flex-1 shrink-0 basis-0 min-w-0">
            <Button
              variant={ButtonVariants.Primary}
              style={
                buttonProps.style
                  ? [tw.style('rounded-xl'), buttonProps.style]
                  : tw.style('rounded-xl')
              }
              {...buttonProps}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
