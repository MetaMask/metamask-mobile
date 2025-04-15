/* eslint-disable import/prefer-default-export */
// Third party dependencies.
import React from 'react';

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
//Migrated to Common.selectors.ts

// Sample consts
export const SAMPLE_TEXTFIELD_PROPS: TextFieldProps = {
  startAccessory: <Icon {...SAMPLE_ICON_PROPS} />,
  endAccessory: <HelpText>SAMPLE</HelpText>,
  size: DEFAULT_TEXTFIELD_SIZE,
  isError: false,
  isDisabled: false,
  isReadonly: false,
  placeholder: 'Sample Placeholder',
};
