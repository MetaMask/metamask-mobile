/* eslint-disable import/prefer-default-export */
// External dependencies.
import { TextVariant, TextColor } from '../../Texts/Text';
import { SAMPLE_AVATAR_PROPS } from '../../Avatars/Avatar/Avatar.constants';

// Internal dependencies.
import { ListItemProps } from './ListItem.types';

// Defaults
export const DEFAULT_LISTITEM_LABEL_TEXTVARIANT = TextVariant.BodyMD;
export const DEFAULT_LISTITEM_LABEL_TEXTCOLOR = TextColor.Default;
export const DEFAULT_LISTITEM_DESCRIPTION_TEXTVARIANT = TextVariant.BodySM;
export const DEFAULT_LISTITEM_DESCRIPTION_TEXTCOLOR = TextColor.Alternative;

// Sample consts
export const SAMPLE_LISTITEM_PROPS: ListItemProps = {
  iconProps: SAMPLE_AVATAR_PROPS,
  label: 'Sample ListItem label',
  description: 'Sample ListItem description',
};
