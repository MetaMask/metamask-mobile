/* eslint-disable import/prefer-default-export */
// Third party dependencies.
import React from 'react';
import { TouchableOpacity } from 'react-native';

// External dependencies.
import { TextVariant } from '../../Texts/Text';
import { SAMPLE_ICON_PROPS } from '../../Icons/Icon/Icon.constants';
import Icon from '../../Icons/Icon';
import HelpText from '../HelpText';

// Internal dependencies.
import { TextFieldSize, TextFieldProps } from './TextField.types';

// Defaults
export const DEFAULT_TEXTFIELD_SIZE = TextFieldSize.Md;

// Tokens
export const TOKEN_TEXTFIELD_INPUT_TEXT_VARIANT = TextVariant.BodyMD;

// Test IDs
export const TEXTFIELD_TEST_ID = 'textfield';
export const TEXTFIELD_STARTACCESSORY_TEST_ID = 'textfield-startacccessory';
export const TEXTFIELD_ENDACCESSORY_TEST_ID = 'textfield-endacccessory';

// Sample consts
export const SAMPLE_TEXTFIELD_PROPS: TextFieldProps = {
  startAccessory: <Icon {...SAMPLE_ICON_PROPS} />,
  endAccessory: (
    <TouchableOpacity
      onPress={() => {
        // eslint-disable-next-line no-console
        console.log('pressed');
      }}
    >
      <HelpText>SAMPLE</HelpText>
    </TouchableOpacity>
  ),
  size: DEFAULT_TEXTFIELD_SIZE,
  isError: false,
  isDisabled: false,
  isReadonly: false,
  placeholder: 'Sample Placeholder',
};
