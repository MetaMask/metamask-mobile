import React from 'react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import AssetDetailsActions, {
  AssetDetailsActionsProps,
} from './AssetDetailsActions';
import initialBackgroundState from '../../../../../../../util/test/initial-background-state.json';

const mockInitialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};

const rootReducer = (state = mockInitialState) => state;
const store = createStore(rootReducer);

export default {
  title: 'Component Library / AssetDetailsActions',
  component: AssetDetailsActions,
  decorators: [
    (Story: typeof React.Component) => (
      <Provider store={store}>
        <Story />
      </Provider>
    ),
  ],
};

const Template = (args: AssetDetailsActionsProps) => (
  <AssetDetailsActions {...args} />
);

export const Default = Template.bind(
  {},
  {
    displayBuyButton: true,
    displaySwapsButton: true,
    onBuy: () => null,
    goToSwaps: () => null,
    onSend: () => null,
    onReceive: () => null,
  },
);

export const NoBuyButton = Template.bind(
  {},
  {
    displayBuyButton: false,
    displaySwapsButton: true,
    onBuy: () => null,
    goToSwaps: () => null,
    onSend: () => null,
    onReceive: () => null,
  },
);

export const NoSwapsButton = Template.bind(
  {},
  {
    displayBuyButton: true,
    displaySwapsButton: false,
    onBuy: () => null,
    goToSwaps: () => null,
    onSend: () => null,
    onReceive: () => null,
  },
);

export const NoButtons = Template.bind(
  {},
  {
    displayBuyButton: false,
    displaySwapsButton: false,
    onBuy: () => null,
    goToSwaps: () => null,
    onSend: () => null,
    onReceive: () => null,
  },
);

export const FundActionMenuNavigation = Template.bind(
  {},
  {
    displayBuyButton: true,
    displaySwapsButton: true,
    // No onBuy prop - will navigate to FundActionMenu
    goToSwaps: () => null,
    onSend: () => null,
    onReceive: () => null,
  },
);
