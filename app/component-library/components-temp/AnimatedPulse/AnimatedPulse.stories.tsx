// External dependencies.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { storiesOf } from '@storybook/react-native';

// Internal dependencies.
import AnimatedPulse from './AnimatedPulse';
import ButtonPill from '../Buttons/ButtonPill';
import Text from '../../components/Texts/Text';
import { colors } from '../../../styles/common';

const styles = StyleSheet.create({
  buttonPill: {
    display: 'flex',
    height: 40,
  },
  wrapper: {
    backgroundColor: colors.applePayWhite,
    padding: 20,
  },
});

storiesOf('Components Temp / AnimatedPulse', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    /** @todo add boolean knob. fix Maximum call stack exceeded blocking knob */
    const isPulsing = true;

    return (
      <View style={styles.wrapper}>
        <AnimatedPulse>
          <ButtonPill style={styles.buttonPill}>
            {isPulsing ? <Text> </Text> : <Text>Demo</Text>}
          </ButtonPill>
        </AnimatedPulse>
      </View>
    );
  }
);
