/* eslint-disable import/prefer-default-export */
// External dependencies.
import { TextVariant, TextColor } from '../../Texts/Text';
import { SAMPLE_AVATAR_PROPS } from '../../Avatars/Avatar/Avatar.constants';

// Internal dependencies.
import { ValueListItemProps } from './ValueListItem.types';

// Defaults
export const DEFAULT_VALUELISTITEM_LABEL_TEXTVARIANT = TextVariant.BodyMD;
export const DEFAULT_VALUELISTITEM_LABEL_TEXTCOLOR = TextColor.Default;
export const DEFAULT_VALUELISTITEM_DESCRIPTION_TEXTVARIANT = TextVariant.BodySM;
export const DEFAULT_VALUELISTITEM_DESCRIPTION_TEXTCOLOR =
  TextColor.Alternative;

// Sample consts
export const SAMPLE_VALUELISTITEM_PROPS: ValueListItemProps = {
  iconProps: SAMPLE_AVATAR_PROPS,
  label: 'Sample ValueListItem label',
  description: 'Sample ValueListItem description',
};
