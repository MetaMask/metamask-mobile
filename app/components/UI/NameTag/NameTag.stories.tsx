import React from 'react';
import { View } from 'react-native';
import { Provider } from 'react-redux';
import { Meta, StoryObj } from '@storybook/react-native';
import { configureStore } from '@reduxjs/toolkit';
import { default as NameTagComponent } from './NameTag';
import { NameTagProperties } from './NameTag.types';

const backdropStyle = { backgroundColor: 'white', padding: 50 };
const ADDRESS_1 = '0x2990079bcdEe240329a520d2444386FC119da21a';

type Story = StoryObj<NameTagProperties>;

const storeMock = configureStore({
  reducer: (state) => state,
  preloadedState: {
    settings: { useBlockieIcon: false },
  },
});

const meta: Meta<typeof NameTagComponent> = {
  title: 'Components / UI / NameTag',
  component: NameTagComponent,
  decorators: [
    (story) => (
      <Provider store={storeMock}>
        <View style={backdropStyle}>{story()}</View>
      </Provider>
    ),
  ],
};
export default meta;

export const UnknownAddress: Story = {
  args: { address: ADDRESS_1 },
};

export const NarrowWidth: Story = {
  render() {
    return (
      <View style={backdropStyle}>
        <NameTagComponent address={ADDRESS_1} />
      </View>
    );
  },
};
