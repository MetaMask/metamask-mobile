import React from 'react';
import { ComponentMeta, ComponentStory } from '@storybook/react-native';
import { View, Text } from 'react-native';
import AnimatedTransactionModal from './index';

const AnimatedTransactionModalMeta: ComponentMeta<
  typeof AnimatedTransactionModal
> = {
  title: 'UI / AnimatedTransactionModal',
  component: AnimatedTransactionModal,
  argTypes: {
    review: { action: 'review' },
    onModeChange: { action: 'onModeChange' },
    ready: { control: 'boolean' },
    children: { control: 'object' },
  },
};

export default AnimatedTransactionModalMeta;

const Default: ComponentStory<typeof AnimatedTransactionModal> = (args) => (
  <AnimatedTransactionModal {...args}>
    <View>
      <Text>Child Component</Text>
    </View>
  </AnimatedTransactionModal>
);

Default.args = {
  review: () => {
    // Mock implementation for review function
  },
  onModeChange: (_mode: string) => {
    // Mock implementation for onModeChange function
  },
  ready: true,
  children: (
    <View>
      <Text>Child Component</Text>
    </View>
  ),
};

export { Default };
