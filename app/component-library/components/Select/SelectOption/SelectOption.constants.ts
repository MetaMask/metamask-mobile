/* eslint-disable import/prefer-default-export */
// External dependencies.
import { SAMPLE_AVATAR_PROPS } from '../../Avatars/Avatar/Avatar.constants';

// Internal dependencies.
import { SelectOptionProps } from './SelectOption.types';

// Sample consts
export const SAMPLE_SELECTOPTION_PROPS: SelectOptionProps = {
  iconProps: SAMPLE_AVATAR_PROPS,
  label: 'Sample SelectOption label',
  description: 'Sample SelectOption description',
  isSelected: false,
  isDisabled: false,
};
