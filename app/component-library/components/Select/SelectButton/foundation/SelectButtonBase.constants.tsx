/* eslint-disable import/prefer-default-export */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { SAMPLE_SELECTVALUE_PROPS } from '../../SelectValue/SelectValue.constants';
import Icon, { IconName, IconColor, IconSize } from '../../../Icons/Icon';

// Internal dependencies.
import { SelectButtonBaseProps } from './SelectButtonBase.types';

// Test IDs
export const SELECTBUTTONBASE_CARETICON_TESTID = 'selectbuttonbase-careticon';

// Sample consts
export const SAMPLE_SELECTBUTTONBASE_PROPS: SelectButtonBaseProps = {
  ...SAMPLE_SELECTVALUE_PROPS,
  caretIconEl: (
    <Icon
      name={IconName.ArrowDown}
      color={IconColor.Default}
      size={IconSize.Md}
    />
  ),
};
