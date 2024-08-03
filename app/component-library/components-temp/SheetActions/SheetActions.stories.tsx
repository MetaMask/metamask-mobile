/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';
import { action } from '@storybook/addon-actions';
// External dependencies.

// Internal dependencies.
import SheetActions from './SheetActions';

const SAMPLE_SHEET_ACTIONS_PROPS = [
  {
    label: 'Action 1',
    onPress: action('Action 1 pressed'),
    testID: 'action-1',
    disabled: false,
    isLoading: false,
    isDanger: false,
  },
  {
    label: 'Action 2',
    onPress: action('Action 2 pressed'),
    testID: 'action-2',
    disabled: false,
    isLoading: false,
    isDanger: true,
  },
];

const SheetActionsMeta = {
  title: 'Component Library / SheetActions',
  component: SheetActions,
  argTypes: {
    actions: {
      control: {
        type: 'object',
      },
      defaultValue: SAMPLE_SHEET_ACTIONS_PROPS,
    },
  },
};
export default SheetActionsMeta;

export const DefaultSheetActions = (args: {
  actions: typeof SAMPLE_SHEET_ACTIONS_PROPS;
}) => <SheetActions {...args} />;
