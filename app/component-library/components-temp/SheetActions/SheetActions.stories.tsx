/* eslint-disable no-labels */
/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { createStore } from 'redux';
import { Provider } from 'react-redux';
import { Meta, StoryObj } from '@storybook/react-native';

// Internal dependencies.
import SheetActions from './SheetActions';
import { SheetActionsProps, Action } from './SheetActions.types';

const store = createStore(() => ({}));

const SheetActionsStory = ({ actions }: SheetActionsProps) => (
  <Provider store={store}>
    <SheetActions actions={actions} />
  </Provider>
);

const defaultActions: Action[] = [
  { label: 'Action 1', onPress: () => console.log('Action 1 pressed') },
  { label: 'Action 2', onPress: () => console.log('Action 2 pressed') },
];

const disabledActions: Action[] = [
  {
    label: 'Disabled Action',
    onPress: () => console.log('Disabled Action attempted, but it is disabled'),
    disabled: true,
  },
  {
    label: 'Enabled Action',
    onPress: () => console.log('Enabled Action pressed'),
  },
];

const loadingActions: Action[] = [
  {
    label: 'Loading Action',
    onPress: () =>
      console.log('Loading Action attempted, but it is still loading'),
    isLoading: true,
  },
  {
    label: 'Normal Action',
    onPress: () => console.log('Normal Action pressed'),
  },
];

const dangerActions: Action[] = [
  {
    label: 'Danger Action',
    onPress: () => console.log('Danger Action pressed'),
    isDanger: true,
  },
  { label: 'Cancel', onPress: () => console.log('Cancel pressed') },
];

const SheetActionsMeta: Meta<typeof SheetActions> = {
  title: 'Components Temp / SheetActions',
  component: SheetActions,
  decorators: [
    (Story) => (
      <Provider store={store}>
        <Story />
      </Provider>
    ),
  ],
};

export default SheetActionsMeta;

type Story = StoryObj<typeof SheetActions>;

export const Default: Story = {
  render: () => <SheetActionsStory actions={defaultActions} />,
};

export const WithDisabledAction: Story = {
  render: () => <SheetActionsStory actions={disabledActions} />,
};

export const WithLoadingAction: Story = {
  render: () => <SheetActionsStory actions={loadingActions} />,
};

export const WithDangerAction: Story = {
  render: () => <SheetActionsStory actions={dangerActions} />,
};
