// Third party dependencies.
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

// External dependencies.
import { ButtonSize } from '../../components/Buttons/Button/Button.types';
import Text, { TextVariant } from '../../components/Texts/Text';
import { IconName } from '../../components/Icons/Icon';
import { Theme } from '../../../util/theme/models';
import { mockTheme } from '../../../util/theme';

// Internal dependencies.
import { default as SegmentedControlComponent } from './SegmentedControl';
import { SAMPLE_SEGMENTEDCONTROL_OPTIONS } from './SegmentedControl.constants';

const SegmentedControlStoryMeta = {
  title: 'Components Temp / SegmentedControl',
  component: SegmentedControlComponent,
};

export default SegmentedControlStoryMeta;

// Sample options with many items to demonstrate scrollable behavior
const MANY_OPTIONS = [
  { value: 'option1', label: 'Option 1' },
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

// Button size options
const SIZE_OPTIONS = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
];

const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    container: {
      padding: 16,
    },
    scrollContainer: {
      flexGrow: 1,
      paddingHorizontal: 16,
    },
    section: {
      marginVertical: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    description: {
      marginBottom: 12,
    },
    spacer: {
      height: 24,
    },
    demoWrapper: {
      marginTop: 12,
    },
    sideBySide: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    halfWidth: {
      width: '48%',
    },
    fullWidth: {
      width: '100%',
    },
    sizeDemo: {
      marginBottom: 16,
    },
    disabled: {
      opacity: 0.5,
    },
    customStyle: {
      backgroundColor: colors.background.alternative,
      padding: 12,
      borderRadius: 8,
      marginTop: 12,
    },
    customControlStyle: {
      backgroundColor: colors.background.default,
      borderRadius: 12,
    },
  });

// ========================
// Demo Components
// ========================

// 1. Basic Single-Select Control
const BasicSingleSelectDemo = () => {
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

// 2. Multi-Select Control
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

// 3. Scrollable Single-Select with Flexible Width
const ScrollableFlexibleWidthDemo = () => {
  const [selectedValue, setSelectedValue] = useState<string>(
    MANY_OPTIONS[0].value,
  );

  return (
    <SegmentedControlComponent
      options={MANY_OPTIONS}
      selectedValue={selectedValue}
      isScrollable
      isButtonWidthFlexible
      onValueChange={(value) => setSelectedValue(value)}
    />
  );
};

// 4. Scrollable Single-Select with Fixed Width
const ScrollableFixedWidthDemo = () => {
  const [selectedValue, setSelectedValue] = useState<string>(
    MANY_OPTIONS[0].value,
  );

  return (
    <SegmentedControlComponent
      options={MANY_OPTIONS}
      selectedValue={selectedValue}
      isScrollable
      isButtonWidthFlexible={false}
      onValueChange={(value) => setSelectedValue(value)}
    />
  );
};

// 7. Single-Select with Icons (Now with Flexible Width)
const SingleSelectWithIconsDemo = () => {
  const [selectedValue, setSelectedValue] = useState<string>(
    OPTIONS_WITH_ICONS[0].value,
  );

  return (
    <SegmentedControlComponent
      options={OPTIONS_WITH_ICONS}
      selectedValue={selectedValue}
      isButtonWidthFlexible
      isScrollable
      onValueChange={(value) => setSelectedValue(value)}
    />
  );
};

// 8. Multi-Select with Icons (Scrollable)
const MultiSelectWithIconsScrollableDemo = () => {
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

// 9. Button Size Variations
const ButtonSizesDemo = ({
  styles,
}: {
  styles: ReturnType<typeof createStyles>;
}) => {
  const [selectedSmall, setSelectedSmall] = useState<string>(
    SIZE_OPTIONS[0].value,
  );
  const [selectedMedium, setSelectedMedium] = useState<string>(
    SIZE_OPTIONS[0].value,
  );
  const [selectedLarge, setSelectedLarge] = useState<string>(
    SIZE_OPTIONS[0].value,
  );

  return (
    <View>
      <View style={styles.sizeDemo}>
        <Text variant={TextVariant.BodySM} style={styles.description}>
          Small Size
        </Text>
        <SegmentedControlComponent
          options={SIZE_OPTIONS}
          selectedValue={selectedSmall}
          onValueChange={(value) => setSelectedSmall(value)}
          size={ButtonSize.Sm}
        />
      </View>

      <View style={styles.sizeDemo}>
        <Text variant={TextVariant.BodySM} style={styles.description}>
          Medium Size (Default)
        </Text>
        <SegmentedControlComponent
          options={SIZE_OPTIONS}
          selectedValue={selectedMedium}
          onValueChange={(value) => setSelectedMedium(value)}
          size={ButtonSize.Md}
        />
      </View>

      <View style={styles.sizeDemo}>
        <Text variant={TextVariant.BodySM} style={styles.description}>
          Large Size
        </Text>
        <SegmentedControlComponent
          options={SIZE_OPTIONS}
          selectedValue={selectedLarge}
          onValueChange={(value) => setSelectedLarge(value)}
          size={ButtonSize.Lg}
        />
      </View>
    </View>
  );
};

// 10. Disabled State
const DisabledStateDemo = ({
  styles,
}: {
  styles: ReturnType<typeof createStyles>;
}) => (
  <View style={styles.demoWrapper}>
    <SegmentedControlComponent
      options={SAMPLE_SEGMENTEDCONTROL_OPTIONS}
      selectedValue={SAMPLE_SEGMENTEDCONTROL_OPTIONS[1].value}
      onValueChange={(value) => {
        // This function intentionally left empty as the component is disabled
        // eslint-disable-next-line no-console
        console.log('Disabled component clicked:', value);
      }}
      isDisabled
    />
  </View>
);

// This is needed to suppress the unused variable warnings
// These components are used in the story but ESLint doesn't recognize it
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _unusedComponents = {
  BasicSingleSelectDemo,
  MultiSelectDemo,
  ScrollableFlexibleWidthDemo,
  ScrollableFixedWidthDemo,
  SingleSelectWithIconsDemo,
  MultiSelectWithIconsScrollableDemo,
  ButtonSizesDemo,
  DisabledStateDemo,
};

// Replace all the individual exports with a single comprehensive view
export const SegmentedControl = {
  render: () => {
    const styles = createStyles(mockTheme);

    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text variant={TextVariant.HeadingSM}>
            SegmentedControl Component
          </Text>
          <Text variant={TextVariant.BodySM}>
            A set of buttons grouped together to switch between related views or
            modes.
          </Text>

          <View style={styles.section}>
            <Text variant={TextVariant.BodyMDBold}>Basic Single-Select</Text>
            <Text variant={TextVariant.BodySM} style={styles.description}>
              The default configuration with single-select behavior
            </Text>
            <BasicSingleSelectDemo />
          </View>

          <View style={styles.section}>
            <Text variant={TextVariant.BodyMDBold}>Multi-Select</Text>
            <Text variant={TextVariant.BodySM} style={styles.description}>
              Allows selecting multiple options simultaneously
            </Text>
            <MultiSelectDemo />
          </View>

          <View style={styles.section}>
            <Text variant={TextVariant.BodyMDBold}>
              Scrollable with Flexible Width
            </Text>
            <Text variant={TextVariant.BodySM} style={styles.description}>
              Horizontally scrollable with button width based on content
            </Text>
            <ScrollableFlexibleWidthDemo />
          </View>

          <View style={styles.section}>
            <Text variant={TextVariant.BodyMDBold}>
              Scrollable with Fixed Width
            </Text>
            <Text variant={TextVariant.BodySM} style={styles.description}>
              Horizontally scrollable with equal button widths
            </Text>
            <ScrollableFixedWidthDemo />
          </View>

          <View style={styles.section}>
            <Text variant={TextVariant.BodyMDBold}>
              Single-Select with Icons
            </Text>
            <Text variant={TextVariant.BodySM} style={styles.description}>
              Buttons with both text and icons for enhanced visual cues
            </Text>
            <SingleSelectWithIconsDemo />
          </View>

          <View style={styles.section}>
            <Text variant={TextVariant.BodyMDBold}>
              Multi-Select with Icons (Scrollable)
            </Text>
            <Text variant={TextVariant.BodySM} style={styles.description}>
              Multi-select with icons in a scrollable container
            </Text>
            <MultiSelectWithIconsScrollableDemo />
          </View>

          <View style={styles.section}>
            <Text variant={TextVariant.BodyMDBold}>Size Variations</Text>
            <Text variant={TextVariant.BodySM} style={styles.description}>
              Small, medium (default), and large button sizes
            </Text>
            <ButtonSizesDemo styles={styles} />
          </View>

          <View style={styles.section}>
            <Text variant={TextVariant.BodyMDBold}>Disabled State</Text>
            <Text variant={TextVariant.BodySM} style={styles.description}>
              Control in a disabled state with interaction prevented
            </Text>
            <DisabledStateDemo styles={styles} />
          </View>
        </View>
      </ScrollView>
    );
  },
};
