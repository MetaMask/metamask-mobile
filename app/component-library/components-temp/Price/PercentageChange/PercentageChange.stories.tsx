import React from 'react';
import { Provider } from 'react-redux';
import PercentageChange from './PercentageChange';
import { createStore } from 'redux';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';

const mockInitialState = {
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
    (Story: typeof React.Component) => (
      <Provider store={store}>
        <Story />
      </Provider>
    ),
  ],
};

const Template = (args: { value: number | null | undefined }) => (
  <PercentageChange {...args} />
);

export const Default = Template.bind(
  {},
  {
    value: 0,
  },
);

export const PositiveChange = Template.bind(
  {},
  {
    value: 5.5,
  },
);

export const NegativeChange = Template.bind(
  {},
  {
    value: -3.75,
  },
);

export const NoChange = Template.bind(
  {},
  {
    value: 0,
  },
);

export const InvalidValue = Template.bind(
  {},
  {
    value: null,
  },
);
