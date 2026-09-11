import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, type ViewStyle } from 'react-native';
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
  /** Uniform gap (px) between the outer border and the inner sliding pill. */
  inset: number;
  containerBorderRadius: number;
  pillBorderRadius: number;
  containerBorderColor?: string;
  sliderBackgroundColor: string;
  pillPaddingHorizontal: number;
  pillPaddingVertical: number;
  /** Pills stretch to fill the container width (use for full-width toggles). */
  stretchPills?: boolean;
  /** Selected pill is Medium, unselected is Regular. Both Medium when false. */
  weightBySelection?: boolean;
  /** Extra styles on the outer container, e.g. margins. */
  style?: ViewStyle;
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
  },
  slider: {
    position: 'absolute',
  },
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stretchPill: {
    flex: 1,
  },
});

function SlidingPillToggle<T extends string>({
  value,
  options,
  onChange,
  isDisabled = false,
  testID,
  inset,
  containerBorderRadius,
  pillBorderRadius,
  containerBorderColor,
  sliderBackgroundColor,
  pillPaddingHorizontal,
  pillPaddingVertical,
  stretchPills = false,
  weightBySelection = false,
  style,
}: SlidingPillToggleProps<T>) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [pillWidth, setPillWidth] = useState(0);
  const [firstOption, secondOption] = options;

  useEffect(() => {
    if (!pillWidth) return;
    Animated.spring(slideAnim, {
      toValue: value === firstOption.value ? 0 : pillWidth,
      useNativeDriver: true,
      tension: 180,
      friction: 20,
    }).start();
  }, [value, pillWidth, firstOption.value, slideAnim]);

  const pillMinWidth = stretchPills ? undefined : pillWidth;

  const renderOption = (option: SlidingPillOption<T>) => {
    const isSelected = value === option.value;
    return (
      <Pressable
        key={option.value}
        onPress={() => {
          if (!isDisabled && value !== option.value) {
            playSelection();
            onChange(option.value);
          }
        }}
        onLayout={(e) => {
          const { width } = e.nativeEvent.layout;
          setPillWidth((prev) => Math.max(prev, width));
        }}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected, disabled: isDisabled }}
        testID={option.testID}
        style={[
          styles.pill,
          stretchPills ? styles.stretchPill : { minWidth: pillMinWidth },
          {
            paddingHorizontal: pillPaddingHorizontal,
            paddingVertical: pillPaddingVertical,
          },
        ]}
      >
        <Text
          variant={TextVariant.BodySm}
          fontWeight={
            weightBySelection && !isSelected
              ? FontWeight.Regular
              : FontWeight.Medium
          }
          color={TextColor.TextDefault}
        >
          {option.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <Box
      testID={testID}
      style={[
        styles.container,
        {
          borderRadius: containerBorderRadius,
          borderColor: containerBorderColor,
        },
        style,
      ]}
    >
      {pillWidth > 0 && (
        <Animated.View
          style={[
            styles.slider,
            {
              top: inset,
              bottom: inset,
              left: inset,
              width: pillWidth,
              borderRadius: pillBorderRadius,
              backgroundColor: sliderBackgroundColor,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        />
      )}
      <Box flexDirection={BoxFlexDirection.Row} style={{ padding: inset }}>
        {renderOption(firstOption)}
        {renderOption(secondOption)}
      </Box>
    </Box>
  );
}

export default SlidingPillToggle;
