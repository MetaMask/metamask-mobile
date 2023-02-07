/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';

// Internal dependencies.
import TextField from './TextField';
import { TextFieldProps } from './TextField.types';

export const getTextFieldStoryProps = (): TextFieldProps => {
  return {};
};

const TextFieldStory = () => <TextField {...getTextFieldStoryProps()} />;

storiesOf('Morph / Lists', module).add('TextField', TextFieldStory);

export default TextFieldStory;
