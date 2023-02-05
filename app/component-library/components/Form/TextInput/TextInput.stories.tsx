/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { boolean, select } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { storybookPropsGroupID } from '../../../constants/storybook.constants';
import { TextVariant } from '../../Texts/Text';
import { DEFAULT_TEXT_VARIANT } from '../../Texts/Text/Text.constants';

// Internal dependencies.
import TextInput from './TextInput';
import { TextInputProps } from './TextInput.types';

export const getTextInputStoryProps = (): TextInputProps => {
  const textVariantsSelector = select(
    'textVariant',
    TextVariant,
    DEFAULT_TEXT_VARIANT,
    storybookPropsGroupID,
  );

  const disabled = boolean('disabled', false, storybookPropsGroupID);
  const disableStateStyles = boolean(
    'disableStateStyles',
    false,
    storybookPropsGroupID,
  );
  return {
    textVariant: textVariantsSelector,
    disabled,
    disableStateStyles,
  };
};

const TextInputStory = () => <TextInput {...getTextInputStoryProps()} />;

storiesOf('Component Library / Form', module).add('TextInput', TextInputStory);

export default TextInputStory;
