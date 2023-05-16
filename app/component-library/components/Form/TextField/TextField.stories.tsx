/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { boolean, select } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../constants/storybook.constants';

// Internal dependencies.
import TextField from './TextField';
import { TextFieldProps, TextFieldSize } from './TextField.types';
import { DEFAULT_TEXTFIELD_SIZE } from './TextField.constants';

export const getTextFieldStoryProps = (): TextFieldProps => {
  const sizeSelector = select(
    'size',
    TextFieldSize,
    DEFAULT_TEXTFIELD_SIZE,
    storybookPropsGroupID,
  );
  const isError = boolean('isError', false, storybookPropsGroupID);
  const isDisabled = boolean('isDisabled', false, storybookPropsGroupID);

  return {
    size: sizeSelector,
    isError,
    isDisabled,
  };
};

const TextFieldStory = () => <TextField {...getTextFieldStoryProps()} />;

storiesOf('Component Library / Form', module).add('TextField', TextFieldStory);

export default TextFieldStory;
