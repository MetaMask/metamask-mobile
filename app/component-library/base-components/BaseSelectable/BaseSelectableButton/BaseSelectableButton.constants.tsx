// Third party dependencies
import React from 'react';

// External dependencies
import Icon, { IconName } from '../../../components/Icons/Icon';
import Text from '../../../components/Texts/Text';

// Internal dependencies
import { BaseSelectableButtonProps } from './BaseSelectableButton.types';

// Defaults
export const DEFAULT_BASESELECTABLEBUTTON_PLACEHOLDER_STRING = 'Select an item';

// Test IDs
export const BASESELECTABLEBUTTON_TESTID = 'baseselectablebutton';
export const BASESELECTABLEBUTTON_PLACEHOLDER_TESTID =
  'baseselectablebutton-placeholder';

// Sample consts
export const SAMPLE_BASESELECTABLEBUTTON_PROPS: BaseSelectableButtonProps = {
  caretIconEl: <Icon name={IconName.Arrow2Down} />,
  isDisabled: false,
  isDanger: false,
  placeholder: DEFAULT_BASESELECTABLEBUTTON_PLACEHOLDER_STRING,
  children: <Text>{DEFAULT_BASESELECTABLEBUTTON_PLACEHOLDER_STRING}</Text>,
};
