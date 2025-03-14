// Third party dependencies.
import React from 'react';
import { View, StyleSheet } from 'react-native';

// External dependencies.
import { ButtonSize } from '../../components/Buttons/Button/Button.types';
import Title from '../../../components/Base/Title';
import Text, { TextVariant } from '../../components/Texts/Text';

// Internal dependencies.
import { default as SegmentedControlComponent } from './SegmentedControl';
import { SAMPLE_SEGMENTEDCONTROL_OPTIONS } from './SegmentedControl.constants';

const SegmentedControlStoryMeta = {
  title: 'Components Temp / SegmentedControl',
  component: SegmentedControlComponent,
};

export default SegmentedControlStoryMeta;

// No-op function for handling value changes in the story
const handleValueChange = (_value: string) => {
  /* For demo purposes only */
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  section: {
    marginVertical: 16,
  },
});

export const SegmentedControl = {
  render: () => (
    <View style={styles.container}>
      <Title>SegmentedControl Component</Title>
      <Text variant={TextVariant.BodySM}>
        A set of buttons grouped together to switch between related views or
        modes.
      </Text>

      <View style={styles.section}>
        <Text variant={TextVariant.BodyMDBold}>Default</Text>
        <SegmentedControlComponent
          options={SAMPLE_SEGMENTEDCONTROL_OPTIONS}
          selectedValue={SAMPLE_SEGMENTEDCONTROL_OPTIONS[0].value}
          onValueChange={handleValueChange}
        />
      </View>

      <View style={styles.section}>
        <Text variant={TextVariant.BodyMDBold}>Large Size</Text>
        <SegmentedControlComponent
          options={SAMPLE_SEGMENTEDCONTROL_OPTIONS}
          selectedValue={SAMPLE_SEGMENTEDCONTROL_OPTIONS[0].value}
          size={ButtonSize.Lg}
          onValueChange={handleValueChange}
        />
      </View>

      <View style={styles.section}>
        <Text variant={TextVariant.BodyMDBold}>Small Size</Text>
        <SegmentedControlComponent
          options={SAMPLE_SEGMENTEDCONTROL_OPTIONS}
          selectedValue={SAMPLE_SEGMENTEDCONTROL_OPTIONS[0].value}
          size={ButtonSize.Sm}
          onValueChange={handleValueChange}
        />
      </View>

      <View style={styles.section}>
        <Text variant={TextVariant.BodyMDBold}>Disabled</Text>
        <SegmentedControlComponent
          options={SAMPLE_SEGMENTEDCONTROL_OPTIONS}
          selectedValue={SAMPLE_SEGMENTEDCONTROL_OPTIONS[0].value}
          isDisabled
          onValueChange={handleValueChange}
        />
      </View>
    </View>
  ),
};
