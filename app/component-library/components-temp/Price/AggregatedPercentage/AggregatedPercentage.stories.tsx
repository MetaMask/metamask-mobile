import React from 'react';
import { Provider } from 'react-redux';
import AggregatedPercentage from './AggregatedPercentage';
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
  title: 'Component Library / AggregatedPercentage',
  component: AggregatedPercentage,
  decorators: [
    (Story) => (
      <Provider store={store}>
        <Story />
      </Provider>
    ),
  ],
};

const Template = (args) => <AggregatedPercentage {...args} />;

export const Default = Template.bind({});
Default.args = {
  ethFiat: 1000,
  tokenFiat: 500,
  tokenFiat1dAgo: 950,
  ethFiat1dAgo: 450,
};

export const NegativePercentageChange = Template.bind({});
NegativePercentageChange.args = {
  ethFiat: 900,
  tokenFiat: 400,
  tokenFiat1dAgo: 950,
  ethFiat1dAgo: 1000,
};

export const PositivePercentageChange = Template.bind({});
PositivePercentageChange.args = {
  ethFiat: 1100,
  tokenFiat: 600,
  tokenFiat1dAgo: 500,
  ethFiat1dAgo: 1000,
};

export const MixedPercentageChange = Template.bind({});
MixedPercentageChange.args = {
  ethFiat: 1050,
  tokenFiat: 450,
  tokenFiat1dAgo: 500,
  ethFiat1dAgo: 1000,
};
