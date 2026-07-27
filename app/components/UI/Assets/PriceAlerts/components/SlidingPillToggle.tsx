import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  TouchableOpacity,
  type LayoutRectangle,
} from 'react-native';
import {
  Box,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { playSelection } from '../../../../../util/haptics';

export interface SlidingPillOption<T extends string> {
  value: T;
  label: string;
  testID: string;
}

interface SlidingPillToggleProps<T extends string> {
  value: T;
  options: readonly [SlidingPillOption<T>, SlidingPillOption<T>];
  onChange: (value: T) => void;
  isDisabled?: boolean;
  testID: string;
  containerTwClassName: string;
  pillTwClassName: string;
  sliderBackgroundColor: string;
  sliderBorderRadius: number;
  /** When true, both pills grow equally (`flex: 1`). */
  equalWidthPills?: boolean;
  /**
   * When true, the selected pill uses Medium weight and the other Regular.
   * When false, both pills stay Medium.
   */
  weightBySelection?: boolean;
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  slider: {
    position: 'absolute',
  },
  equalWidthPill: {
    flex: 1,
  },
});

/**
 * Two-option animated sliding-pill toggle. Shared by alert type and period
 * selectors (same spring technique as QuickBuyTradeModeToggle).
 */
function SlidingPillToggle<T extends string>({
  value,
  options,
  onChange,
  isDisabled = false,
  testID,
  containerTwClassName,
  pillTwClassName,
  sliderBackgroundColor,
  sliderBorderRadius,
  equalWidthPills = false,
  weightBySelection = false,
}: SlidingPillToggleProps<T>) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [firstLayout, setFirstLayout] = useState<LayoutRectangle | null>(null);
  const [secondWidth, setSecondWidth] = useState(0);
  const [firstOption, secondOption] = options;

  const handlePress = (next: T) => {
    if (isDisabled) return;
    if (value !== next) {
      playSelection();
      onChange(next);
    }
  };

  useEffect(() => {
    if (!firstLayout) return;
    Animated.spring(slideAnim, {
      toValue: value === firstOption.value ? 0 : firstLayout.width,
      useNativeDriver: true,
      tension: 180,
      friction: 20,
    }).start();
  }, [value, firstLayout, firstOption.value, slideAnim]);

  const sliderWidth =
    value === firstOption.value ? (firstLayout?.width ?? 0) : secondWidth;

  const renderOption = (
    option: SlidingPillOption<T>,
    onLayout: (layout: LayoutRectangle) => void,
  ) => {
    const isSelected = value === option.value;
    return (
      <TouchableOpacity
        key={option.value}
        onPress={() => handlePress(option.value)}
        onLayout={(e) => onLayout(e.nativeEvent.layout)}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{
          selected: isSelected,
          disabled: isDisabled,
        }}
        testID={option.testID}
        style={equalWidthPills ? styles.equalWidthPill : undefined}
      >
        <Box twClassName={`${pillTwClassName} items-center`}>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={
              weightBySelection
                ? isSelected
                  ? FontWeight.Medium
                  : FontWeight.Regular
                : FontWeight.Medium
            }
            color={TextColor.TextDefault}
          >
            {option.label}
          </Text>
        </Box>
      </TouchableOpacity>
    );
  };

  return (
    <Box
      testID={testID}
      flexDirection={BoxFlexDirection.Row}
      twClassName={containerTwClassName}
      style={styles.container}
    >
      {firstLayout && sliderWidth > 0 && (
        <Animated.View
          style={[
            styles.slider,
            {
              left: firstLayout.x,
              top: firstLayout.y,
              height: firstLayout.height,
              width: sliderWidth,
              borderRadius: sliderBorderRadius,
              backgroundColor: sliderBackgroundColor,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        />
      )}

      {renderOption(firstOption, setFirstLayout)}
      {renderOption(secondOption, (layout) => setSecondWidth(layout.width))}
    </Box>
  );
}

export default SlidingPillToggle;
