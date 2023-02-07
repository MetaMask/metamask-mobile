/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';

// Internal dependencies.
import TextInput from './TextInput';
import { TextInputProps } from './TextInput.types';

export const getTextInputStoryProps = (): TextInputProps => {
  return {};
};

const TextInputStory = () => <TextInput {...getTextInputStoryProps()} />;

storiesOf('Morph / Lists', module).add('TextInput', TextInputStory);

export default TextInputStory;
