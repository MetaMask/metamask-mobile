/* eslint-disable no-console, react-native/no-inline-styles */

// Third party dependencies.
import React from 'react';
import { boolean } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { storybookPropsGroupID } from '../../constants/storybook.constants';

// Internal dependencies.
import Checkbox from './Checkbox';
import { CheckboxProps } from './Checkbox.types';

export const getCheckboxStoryProps = (): CheckboxProps => {
  const isCheckedToggle = boolean('isChecked', false, storybookPropsGroupID);
  const isIndeterminateToggle = boolean(
    'isIndeterminate',
    false,
    storybookPropsGroupID,
  );
  const isDisabledToggle = boolean('isDisabled', false, storybookPropsGroupID);
  const isReadonlyToggle = boolean('isReadonly', false, storybookPropsGroupID);

  return {
    isChecked: isCheckedToggle,
    isIndeterminate: isIndeterminateToggle,
    isDisabled: isDisabledToggle,
    isReadonly: isReadonlyToggle,
    onPress: () => console.log("I'm clicked!"),
  };
};

const CheckboxStory = () => <Checkbox {...getCheckboxStoryProps()} />;

storiesOf('Component Library / Checkbox', module).add(
  'Checkbox',
  CheckboxStory,
);

export default CheckboxStory;
