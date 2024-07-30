import React from 'react';
import { Provider } from 'react-redux';
import PercentageChange from './PercentageChange';
import { createStore } from 'redux';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';
import { StoryObj, Meta } from '@storybook/react-native';

const mockInitialState = {
  wizard: {
    step: 1,
  },
  engine: {
    backgroundState: initialBackgroundState,
  },
};

const rootReducer = (state = mockInitialState) => state;
const store = createStore(rootReducer);

interface TemplateArgs {
  value: number | null;
}

const Template: StoryObj<TemplateArgs> = {
  render: (args: TemplateArgs) => (
    <Provider store={store}>
      <PercentageChange {...args} />
    </Provider>
  ),
};

const meta: Meta<typeof PercentageChange> = {
  title: 'Component Library / PercentageChange',
  component: PercentageChange,
};

export default meta;

export const Default: StoryObj<TemplateArgs> = {
  ...Template,
  args: {
    value: 0,
  },
};

export const PositiveChange: StoryObj<TemplateArgs> = {
  ...Template,
  args: {
    value: 5.5,
  },
};

export const NegativeChange: StoryObj<TemplateArgs> = {
  ...Template,
  args: {
    value: -3.75,
  },
};

export const NoChange: StoryObj<TemplateArgs> = {
  ...Template,
  args: {
    value: 0,
  },
};

export const InvalidValue: StoryObj<TemplateArgs> = {
  ...Template,
  args: {
    value: null,
  },
};
