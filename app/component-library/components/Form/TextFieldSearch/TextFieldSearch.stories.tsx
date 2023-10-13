/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { boolean } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../constants/storybook.constants';

// Internal dependencies.
import TextFieldSearch from './TextFieldSearch';
import { TextFieldSearchProps } from './TextFieldSearch.types';

export const getTextFieldSearchStoryProps = (): TextFieldSearchProps => {
  const showClearButton = boolean(
    'showClearButton',
    false,
    storybookPropsGroupID,
  );

  return { showClearButton };
};

const TextFieldSearchStory = () => (
  <TextFieldSearch {...getTextFieldSearchStoryProps()} />
);

storiesOf('Component Library / Form', module).add(
  'TextFieldSearch',
  TextFieldSearchStory,
);

export default TextFieldSearchStory;
