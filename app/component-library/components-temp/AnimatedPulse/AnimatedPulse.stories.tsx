// External dependencies.
import React from 'react';
import { Text } from 'react-native';

// Internal dependencies.
import ButtonPill from '../Buttons/ButtonPill';
import AnimatedPulse from './AnimatedPulse';

const AnimatedPulseMeta = {
  title: 'Confirm / Info / TypedSignV3V4 / Simulation / Animated Pulse',
  component: AnimatedPulse,
  argTypes: {
    isPulsing: {
      control: { type: 'boolean' },
      defaultValue: true,
    },
  },
};

export default AnimatedPulseMeta;

export const Default = {
  render: ({
    isPulsing,
  }: {
    isPulsing: boolean;
  }) => (
    <AnimatedPulse isPulsing={isPulsing}>
      <ButtonPill>
        <Text>Demo</Text>
      </ButtonPill>
    </AnimatedPulse>
  ),
};
