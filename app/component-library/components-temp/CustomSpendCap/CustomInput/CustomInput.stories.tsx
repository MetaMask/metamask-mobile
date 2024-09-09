import React from 'react';
import { View } from 'react-native';
import { createStore } from 'redux';
import { Provider } from 'react-redux';
import CustomInput from './CustomInput';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  CUSTOM_SPEND_CAP_INPUT_TEST_ID,
  CUSTOM_SPEND_CAP_MAX_TEST_ID,
  CUSTOM_SPEND_CAP_INPUT_INPUT_ID,
} from './CustomInput.constants';

// Mock Redux store
const store = createStore(() => ({}));

const withProvider = (Story: React.ComponentType) => (
  <Provider store={store}>
    <View>
      <Story />
    </View>
  </Provider>
);

const meta: Meta<typeof CustomInput> = {
  title: 'Components Temp / CustomSpendCap / CustomInput',
  component: CustomInput,
  decorators: [withProvider],
  argTypes: {
    ticker: { control: 'text' },
    value: { control: 'text' },
    setValue: { action: 'setValue' },
    isInputGreaterThanBalance: { control: 'boolean' },
    setMaxSelected: { action: 'setMaxSelected' },
    isEditDisabled: { control: 'boolean' },
    tokenDecimal: { control: 'number' },
  },
};

export default meta;

type Story = StoryObj<typeof CustomInput>;

export const Default: Story = {
  args: {
    ticker: 'ETH',
    value: '',
    isInputGreaterThanBalance: false,
    isEditDisabled: false,
    tokenDecimal: 18,
  },
};

export const WithValue: Story = {
  args: {
    ...Default.args,
    value: '1.5',
  },
};

export const InputGreaterThanBalance: Story = {
  args: {
    ...Default.args,
    value: '1000',
    isInputGreaterThanBalance: true,
  },
};

export const EditDisabled: Story = {
  args: {
    ...Default.args,
    value: '2.5',
    isEditDisabled: true,
  },
};
