// External dependencies
import { SAMPLE_AVATAR_PROPS } from '../../../../Avatars/Avatar/Avatar.constants';
import { AvatarSize } from '../../../../Avatars/Avatar';
import { TextVariant, TextColor } from '../../../../Texts/Text';
import { VerticalAlignment } from '../../../../List/ListItem';

// Internal dependencies
import { CellBaseProps } from './CellBase.types';

// Defaults
export const DEFAULT_CELLBASE_AVATAR_SIZE = AvatarSize.Md;
export const DEFAULT_CELLBASE_TITLE_TEXTVARIANT = TextVariant.HeadingSMRegular;
export const DEFAULT_CELLBASE_TITLE_TEXTCOLOR = TextColor.Default;
export const DEFAULT_CELLBASE_SECONDARYTEXT_TEXTVARIANT = TextVariant.BodyMD;
export const DEFAULT_CELLBASE_SECONDARYTEXT_TEXTCOLOR = TextColor.Alternative;
export const DEFAULT_CELLBASE_TERTIARYTEXT_TEXTVARIANT = TextVariant.BodyMD;
export const DEFAULT_CELLBASE_TERTIARYTEXT_TEXTCOLOR = TextColor.Alternative;
export const DEFAULT_CELLBASE_LISTITEM_GAP = 16;
export const DEFAULT_CELLBASE_LISTITEM_VERTICALALIGNMENT =
  VerticalAlignment.Center;

// Sample consts
const SAMPLE_CELLBASE_TITLE = 'Orangefox.eth';
const SAMPLE_CELLBASE_SECONDARYTEXT =
  '0x2990079bcdEe240329a520d2444386FC119da21a';
const SAMPLE_CELLBASE_TERTIARY_TEXT = 'Updated 1 sec ago';
const SAMPLE_CELLBASE_TAGLABEL = 'Imported';

export const SAMPLE_CELLBASE_PROPS: CellBaseProps = {
  avatarProps: SAMPLE_AVATAR_PROPS,
  title: SAMPLE_CELLBASE_TITLE,
  secondaryText: SAMPLE_CELLBASE_SECONDARYTEXT,
  tertiaryText: SAMPLE_CELLBASE_TERTIARY_TEXT,
  tagLabel: SAMPLE_CELLBASE_TAGLABEL,
};
