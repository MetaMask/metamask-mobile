/* eslint-disable import/prefer-default-export */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { SAMPLE_VALUELISTITEM_PROPS } from '../../../../../ValueList/ValueListItem/ValueListItem.constants';
import Icon, { IconName, IconColor, IconSize } from '../../../../../Icons/Icon';

// Internal dependencies.
import { DropdownButtonBaseProps } from './DropdownButtonBase.types';

// Test IDs
export const DROPDOWNBUTTONBASE_CARETICON_TESTID =
  'dropdownbuttonbase-careticon';

// Sample consts
export const SAMPLE_DROPDOWNBUTTONBASE_PROPS: DropdownButtonBaseProps = {
  ...SAMPLE_VALUELISTITEM_PROPS,
  caretIconEl: (
    <Icon
      name={IconName.ArrowDown}
      color={IconColor.Default}
      size={IconSize.Md}
    />
  ),
};
