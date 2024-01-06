/* eslint-disable import/prefer-default-export */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { SAMPLE_VALUELISTITEM_PROPS } from '../../../ValueList/ValueListItem/ValueListItem.constants';
import Icon, { IconName, IconColor, IconSize } from '../../../Icons/Icon';

// Internal dependencies.
import { SelectableButtonProps } from './SelectableButton.types';

// Test IDs
export const SELECTABLEBUTTON_CARETICON_TESTID = 'SelectableButton-careticon';

// Sample consts
export const SAMPLE_SELECTABLEBUTTON_PROPS: SelectableButtonProps = {
  ...SAMPLE_VALUELISTITEM_PROPS,
  caretIconEl: (
    <Icon
      name={IconName.ArrowDown}
      color={IconColor.Default}
      size={IconSize.Md}
    />
  ),
};
