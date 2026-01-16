// Third party dependencies.
import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

// External dependencies.
import { useStyles } from '../../hooks';
import ButtonToggle from '../../components-temp/Buttons/ButtonToggle';
import { ButtonWidthTypes } from '../../components/Buttons/Button/Button.types';

// Internal dependencies.
import {
  SegmentedControlProps,
  SingleSelectSegmentedControlProps,
  MultiSelectSegmentedControlProps,
} from './SegmentedControl.types';
import styleSheet from './SegmentedControl.styles';
import { DEFAULT_SEGMENTEDCONTROL_SIZE } from './SegmentedControl.constants';

const SegmentedControl = ({
  options,
  size = DEFAULT_SEGMENTEDCONTROL_SIZE,
  isButtonWidthFlexible = true,
  isDisabled = false,
  isMultiSelect = false,
  isScrollable = false,
  style,
  ...props
}: SegmentedControlProps) => {
  const { styles } = useStyles(styleSheet, {
    style,
    size,
    isButtonWidthFlexible,
  });

  // Single select state
  const singleSelectProps = useMemo(
    () =>
      isMultiSelect
        ? { selectedValue: undefined, onValueChange: undefined }
        : (props as SingleSelectSegmentedControlProps),
    [isMultiSelect, props],
  );

  const [internalSingleValue, setInternalSingleValue] = useState<string>(
    singleSelectProps.selectedValue ||
      (options.length > 0 ? options[0].value : ''),
  );

  // Multi select state
  const multiSelectProps = useMemo(
    () =>
      isMultiSelect
        ? (props as MultiSelectSegmentedControlProps)
        : { selectedValues: [], onValueChange: undefined },
    [isMultiSelect, props],
  );

  const [internalMultiValues, setInternalMultiValues] = useState<string[]>(
    multiSelectProps.selectedValues || [],
  );

  // Update internal state when props change
  useEffect(() => {
    if (!isMultiSelect && singleSelectProps.selectedValue !== undefined) {
      setInternalSingleValue(singleSelectProps.selectedValue);
    }
  }, [isMultiSelect, singleSelectProps.selectedValue]);

  useEffect(() => {
    if (isMultiSelect && multiSelectProps.selectedValues) {
      setInternalMultiValues(multiSelectProps.selectedValues);
    }
  }, [isMultiSelect, multiSelectProps.selectedValues]);

  // Define control state
  const isSingleControlled = useMemo(
    () => !isMultiSelect && singleSelectProps.selectedValue !== undefined,
    [isMultiSelect, singleSelectProps.selectedValue],
  );

  const isMultiControlled = useMemo(
    () => isMultiSelect && multiSelectProps.selectedValues !== undefined,
    [isMultiSelect, multiSelectProps.selectedValues],
  );

  const currentSingleValue = useMemo(
    () =>
      isSingleControlled
        ? singleSelectProps.selectedValue
        : internalSingleValue,
    [isSingleControlled, singleSelectProps.selectedValue, internalSingleValue],
  );

  const currentMultiValues = useMemo(
    () =>
      isMultiControlled
        ? multiSelectProps.selectedValues || []
        : internalMultiValues,
    [isMultiControlled, multiSelectProps.selectedValues, internalMultiValues],
  );

  // Handle toggle for single select
  const handleSinglePress = useCallback(
    (value: string) => {
      // Don't trigger if disabled
      if (isDisabled) return;

      if (!isSingleControlled) {
        setInternalSingleValue(value);
      }
      singleSelectProps.onValueChange?.(value);
    },
    [isDisabled, isSingleControlled, singleSelectProps],
  );

  // Handle toggle for multi-select
  const handleMultiPress = useCallback(
    (value: string) => {
      // Don't trigger if disabled
      if (isDisabled) return;

      const newValues = currentMultiValues.includes(value)
        ? currentMultiValues.filter((v) => v !== value)
        : [...currentMultiValues, value];

      if (!isMultiControlled) {
        setInternalMultiValues(newValues);
      }
      multiSelectProps.onValueChange?.(newValues);
    },
    [currentMultiValues, isDisabled, isMultiControlled, multiSelectProps],
  );

  // Determine active state based on mode
  const isOptionActive = useCallback(
    (optionValue: string) => {
      if (isMultiSelect) {
        return currentMultiValues.includes(optionValue);
      }
      return currentSingleValue === optionValue;
    },
    [isMultiSelect, currentSingleValue, currentMultiValues],
  );

  // Handle button press based on mode
  const handleButtonPress = useCallback(
    (value: string) => {
      if (isMultiSelect) {
        handleMultiPress(value);
      } else {
        handleSinglePress(value);
      }
    },
    [isMultiSelect, handleSinglePress, handleMultiPress],
  );

  // Render the buttons with gap between them
  const renderButtons = () =>
    options.map((option) => {
      // Extract standard props and any additional props that might be in the option
      const { value, label, ...optionProps } = option;

      return (
        <View key={value} style={styles.buttonContainer}>
          <ButtonToggle
            label={label}
            isActive={isOptionActive(value)}
            onPress={() => handleButtonPress(value)}
            size={size}
            isDisabled={isDisabled}
            width={
              isButtonWidthFlexible
                ? ButtonWidthTypes.Auto
                : ButtonWidthTypes.Full
            }
            {...optionProps}
          />
        </View>
      );
    });

  // Conditionally render ScrollView or View based on isScrollable prop
  if (isScrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
        {...props}
      >
        <View style={styles.base}>{renderButtons()}</View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.base} {...props}>
      {renderButtons()}
    </View>
  );
};

export default SegmentedControl;
