/* eslint-disable import/prefer-default-export */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { SAMPLE_VALUELISTITEM_PROPS } from '../../../components/ListItem/ListItem/ValueListItem.constants';
import Icon, {
  IconName,
  IconColor,
  IconSize,
} from '../../../components/Icons/Icon';

// Internal dependencies.
import { BaseSelectableButtonProps } from './BaseSelectableButton.types';

// Defaults
export const DEFAULT_BASESELECTABLEBUTTON_PLACEHOLDER_STRING = 'Select an item';

// Test IDs
export const BASESELECTABLEBUTTON_CARETICON_TESTID =
  'BaseSelectableButton-careticon';

// Sample consts
export const SAMPLE_BASESELECTABLEBUTTON_PROPS: BaseSelectableButtonProps = {
  ...SAMPLE_VALUELISTITEM_PROPS,
  caretIconEl: (
    <Icon
      name={IconName.ArrowDown}
      color={IconColor.Default}
      size={IconSize.Md}
    />
  ),
};
