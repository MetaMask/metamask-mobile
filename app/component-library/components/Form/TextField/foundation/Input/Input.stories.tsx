/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { boolean, select } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { TextVariant } from '../../../../Texts/Text';
import { DEFAULT_TEXT_VARIANT } from '../../../../Texts/Text/Text.constants';

// Internal dependencies.
import Input from './Input';
import { InputProps } from './Input.types';

export const getInputStoryProps = (): InputProps => {
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

const InputStory = () => <Input {...getInputStoryProps()} />;

storiesOf('Component Library / Form', module).add(
  'TextField / Input',
  InputStory,
);

export default InputStory;
