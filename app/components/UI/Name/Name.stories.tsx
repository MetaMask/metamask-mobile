import React from 'react';
import { View } from 'react-native';
import { Provider } from 'react-redux';
import { Meta, StoryObj } from '@storybook/react-native';
import { configureStore } from '@reduxjs/toolkit';
import { default as NameComponent } from './Name';
import { NameProperties, NameType } from './Name.types';

const backdropStyle = { backgroundColor: 'white', padding: 50 };
const ADDRESS_1 = '0x2990079bcdEe240329a520d2444386FC119da21a';

type Story = StoryObj<NameProperties>;

const storeMock = configureStore({
  reducer: (state) => state,
  preloadedState: {
    settings: { useBlockieIcon: false },
  },
});

const meta: Meta<typeof NameComponent> = {
  title: 'Components / UI / Name',
  component: NameComponent,
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
  args: { type: NameType.EthereumAddress, value: ADDRESS_1 },
};

export const NarrowWidth: Story = {
  render() {
    return (
      <View style={backdropStyle}>
        <NameComponent type={NameType.EthereumAddress} value={ADDRESS_1} />
      </View>
    );
  },
};
