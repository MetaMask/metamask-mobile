/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { boolean } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { storybookPropsGroupID } from '../../../constants/storybook.constants';

// Internal dependencies.
import Toggle from './Toggle';
import { ToggleProps } from './Toggle.types';

export const getToggleStoryProps = (): ToggleProps => {
  const disabled = boolean('disabled', false, storybookPropsGroupID);

  return {
    disabled,
  };
};

const ToggleStory = () => <Toggle {...getToggleStoryProps()} />;

storiesOf('Component Library / Toggles', module).add('Toggle', ToggleStory);

export default ToggleStory;
