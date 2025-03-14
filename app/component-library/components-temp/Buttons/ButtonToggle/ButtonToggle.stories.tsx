// Third party dependencies.
import React from 'react';
import { View, StyleSheet } from 'react-native';

// External dependencies.
import { IconName } from '../../../components/Icons/Icon';
import Title from '../../../../components/Base/Title';
import Text, { TextVariant } from '../../../components/Texts/Text';

// Internal dependencies.
import { default as ButtonToggleComponent } from './ButtonToggle';

const ButtonToggleStoryMeta = {
  title: 'Components Temp / Buttons / ButtonToggle',
  component: ButtonToggleComponent,
};
export default ButtonToggleStoryMeta;

// No-op function for handling button presses in the story
const handlePress = () => {
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

export const ButtonToggle = {
  render: () => (
    <View style={styles.container}>
      <Title>ButtonToggle Component</Title>
      <Text variant={TextVariant.BodySM}>
        A button that can be toggled between active and inactive states.
      </Text>

      <View style={styles.section}>
        <Text variant={TextVariant.BodyMDBold}>Default (Inactive)</Text>
        <ButtonToggleComponent
          label="Mode 1"
          isActive={false}
          onPress={handlePress}
        />
      </View>

      <View style={styles.section}>
        <Text variant={TextVariant.BodyMDBold}>Active</Text>
        <ButtonToggleComponent label="Mode 1" isActive onPress={handlePress} />
      </View>

      <View style={styles.section}>
        <Text variant={TextVariant.BodyMDBold}>With Icons</Text>
        <ButtonToggleComponent
          label="Mode 1"
          isActive={false}
          startIconName={IconName.Lock}
          endIconName={IconName.Arrow2Right}
          onPress={handlePress}
        />
      </View>
    </View>
  ),
};
