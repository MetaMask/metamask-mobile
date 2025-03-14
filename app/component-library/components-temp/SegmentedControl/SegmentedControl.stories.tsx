// Third party dependencies.
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';

// External dependencies.
import { ButtonSize } from '../../components/Buttons/Button/Button.types';
import Title from '../../../components/Base/Title';
import Text, { TextVariant } from '../../components/Texts/Text';
import { IconName } from '../../components/Icons/Icon';

// Internal dependencies.
import { default as SegmentedControlComponent } from './SegmentedControl';
import { SAMPLE_SEGMENTEDCONTROL_OPTIONS } from './SegmentedControl.constants';

const SegmentedControlStoryMeta = {
  title: 'Components Temp / SegmentedControl',
  component: SegmentedControlComponent,
};

export default SegmentedControlStoryMeta;

// No-op function for handling value changes in the story
const handleSingleValueChange = (_value: string) => {
  /* For demo purposes only */
};

// Sample options with many items to demonstrate scrollable behavior
const MANY_OPTIONS = [
  { value: 'option1', label: 'Option 1 5 6 7  8 ' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
  { value: 'option4', label: 'Option 4' },
  { value: 'option5', label: 'Option 5' },
  { value: 'option6', label: 'Option 6' },
  { value: 'option7', label: 'Option 7' },
  { value: 'option8', label: 'Option 8' },
];

// Sample options with icons
const OPTIONS_WITH_ICONS = [
  { value: 'eth', label: 'ETH', startIconName: IconName.Ethereum },
  { value: 'btc', label: 'BTC', startIconName: IconName.Wallet },
  { value: 'sol', label: 'SOL', startIconName: IconName.Star },
  { value: 'avax', label: 'AVAX', startIconName: IconName.Warning },
  { value: 'matic', label: 'MATIC', startIconName: IconName.Security },
  { value: 'usdt', label: 'USDT', startIconName: IconName.Coin },
  { value: 'link', label: 'LINK', startIconName: IconName.Link },
  { value: 'uni', label: 'UNI', startIconName: IconName.Refresh },
];

// Sample options with varying text lengths for width examples
const VARIED_TEXT_LENGTH_OPTIONS = [
  { value: 'short', label: 'S' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Very Long Text Label' },
  { value: 'another', label: 'Another Option' },
];

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  section: {
    marginVertical: 16,
  },
  description: {
    marginBottom: 8,
  },
  spacer: {
    height: 40,
  },
});

// Demo component with state for multi-select
const MultiSelectDemo = () => {
  const [selectedValues, setSelectedValues] = useState<string[]>([
    SAMPLE_SEGMENTEDCONTROL_OPTIONS[0].value,
    SAMPLE_SEGMENTEDCONTROL_OPTIONS[2].value,
  ]);

  return (
    <SegmentedControlComponent
      options={SAMPLE_SEGMENTEDCONTROL_OPTIONS}
      selectedValues={selectedValues}
      isMultiSelect
      onValueChange={(values) => setSelectedValues(values)}
    />
  );
};

// Demo component with state for single-select
const SingleSelectDemo = () => {
  const [selectedValue, setSelectedValue] = useState<string>(
    SAMPLE_SEGMENTEDCONTROL_OPTIONS[0].value,
  );

  return (
    <SegmentedControlComponent
      options={SAMPLE_SEGMENTEDCONTROL_OPTIONS}
      selectedValue={selectedValue}
      onValueChange={(value) => setSelectedValue(value)}
    />
  );
};

// Demo component for scrollable single-select
const ScrollableSingleSelectDemo = () => {
  const [selectedValue, setSelectedValue] = useState<string>(
    MANY_OPTIONS[0].value,
  );

  return (
    <SegmentedControlComponent
      options={MANY_OPTIONS}
      selectedValue={selectedValue}
      isScrollable
      onValueChange={(value) => setSelectedValue(value)}
    />
  );
};

// Demo component for multi-select with icons and scrolling
const MultiSelectIconsScrollableDemo = () => {
  const [selectedValues, setSelectedValues] = useState<string[]>([
    OPTIONS_WITH_ICONS[0].value,
    OPTIONS_WITH_ICONS[2].value,
  ]);

  return (
    <SegmentedControlComponent
      options={OPTIONS_WITH_ICONS}
      selectedValues={selectedValues}
      isMultiSelect
      isScrollable
      onValueChange={(values) => setSelectedValues(values)}
    />
  );
};

// Demo component for flexible width buttons
const FlexibleWidthDemo = () => {
  const [selectedValue, setSelectedValue] = useState<string>(
    VARIED_TEXT_LENGTH_OPTIONS[0].value,
  );

  return (
    <SegmentedControlComponent
      options={VARIED_TEXT_LENGTH_OPTIONS}
      selectedValue={selectedValue}
      isButtonWidthFlexible
      onValueChange={(value) => setSelectedValue(value)}
    />
  );
};

// Demo component showing width comparison (fixed vs flexible)
const WidthComparisonDemo = () => {
  const [selectedValueFixed, setSelectedValueFixed] = useState<string>(
    VARIED_TEXT_LENGTH_OPTIONS[0].value,
  );
  const [selectedValueFlexible, setSelectedValueFlexible] = useState<string>(
    VARIED_TEXT_LENGTH_OPTIONS[0].value,
  );

  return (
    <View>
      <View style={styles.section}>
        <Text variant={TextVariant.BodySM} style={styles.description}>
          Fixed Width (default): Buttons have equal widths regardless of content
        </Text>
        <SegmentedControlComponent
          options={VARIED_TEXT_LENGTH_OPTIONS}
          selectedValue={selectedValueFixed}
          onValueChange={(value) => setSelectedValueFixed(value)}
        />
      </View>

      <View style={styles.section}>
        <Text variant={TextVariant.BodySM} style={styles.description}>
          Flexible Width: Buttons size based on their content
        </Text>
        <SegmentedControlComponent
          options={VARIED_TEXT_LENGTH_OPTIONS}
          selectedValue={selectedValueFlexible}
          isButtonWidthFlexible
          onValueChange={(value) => setSelectedValueFlexible(value)}
        />
      </View>
    </View>
  );
};

export const SegmentedControl = {
  render: () => (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Title>SegmentedControl Component</Title>
        <Text variant={TextVariant.BodySM}>
          A set of buttons grouped together to switch between related views or
          modes.
        </Text>

        <View style={styles.section}>
          <Text variant={TextVariant.BodyMDBold}>Button Width Options</Text>
          <Text variant={TextVariant.BodySM} style={styles.description}>
            SegmentedControl supports both fixed width and flexible width
            buttons
          </Text>
          <WidthComparisonDemo />
        </View>

        <View style={styles.section}>
          <Text variant={TextVariant.BodyMDBold}>
            Single Select (Controlled Demo)
          </Text>
          <SingleSelectDemo />
        </View>

        <View style={styles.section}>
          <Text variant={TextVariant.BodyMDBold}>
            Multi-Select (Controlled Demo)
          </Text>
          <MultiSelectDemo />
        </View>

        <View style={styles.section}>
          <Text variant={TextVariant.BodyMDBold}>Flexible Width Example</Text>
          <Text variant={TextVariant.BodySM} style={styles.description}>
            When isButtonWidthFlexible is true, buttons size to fit their
            content
          </Text>
          <FlexibleWidthDemo />
        </View>

        <View style={styles.section}>
          <Text variant={TextVariant.BodyMDBold}>
            Scrollable SegmentedControl
          </Text>
          <ScrollableSingleSelectDemo />
        </View>

        <View style={styles.section}>
          <Text variant={TextVariant.BodyMDBold}>
            Multi-Select with Icons (Scrollable)
          </Text>
          <MultiSelectIconsScrollableDemo />
        </View>

        <View style={styles.section}>
          <Text variant={TextVariant.BodyMDBold}>Large Size</Text>
          <SegmentedControlComponent
            options={SAMPLE_SEGMENTEDCONTROL_OPTIONS}
            selectedValue={SAMPLE_SEGMENTEDCONTROL_OPTIONS[0].value}
            size={ButtonSize.Lg}
            onValueChange={handleSingleValueChange}
          />
        </View>

        <View style={styles.section}>
          <Text variant={TextVariant.BodyMDBold}>Small Size</Text>
          <SegmentedControlComponent
            options={SAMPLE_SEGMENTEDCONTROL_OPTIONS}
            selectedValue={SAMPLE_SEGMENTEDCONTROL_OPTIONS[0].value}
            size={ButtonSize.Sm}
            onValueChange={handleSingleValueChange}
          />
        </View>

        <View style={styles.section}>
          <Text variant={TextVariant.BodyMDBold}>Disabled</Text>
          <SegmentedControlComponent
            options={SAMPLE_SEGMENTEDCONTROL_OPTIONS}
            selectedValue={SAMPLE_SEGMENTEDCONTROL_OPTIONS[0].value}
            isDisabled
            onValueChange={handleSingleValueChange}
          />
        </View>

        <View style={styles.spacer} />
      </View>
    </ScrollView>
  ),
};
