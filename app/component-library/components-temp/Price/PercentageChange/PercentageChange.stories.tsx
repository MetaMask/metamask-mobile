import React from 'react';
import { Provider } from 'react-redux';
import PercentageChange from './PercentageChange';
import { createStore } from 'redux';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';

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

export default {
  title: 'Component Library / PercentageChange',
  component: PercentageChange,
  decorators: [
    (Story) => (
      <Provider store={store}>
        <Story />
      </Provider>
    ),
  ],
};

const Template = (args) => <PercentageChange {...args} />;

export const Default = Template.bind({});
Default.args = {
  value: 0,
};

export const PositiveChange = Template.bind({});
PositiveChange.args = {
  value: 5.5,
};

export const NegativeChange = Template.bind({});
NegativeChange.args = {
  value: -3.75,
};

export const NoChange = Template.bind({});
NoChange.args = {
  value: 0,
};

export const InvalidValue = Template.bind({});
InvalidValue.args = {
  value: null,
};
