// External dependencies.
import { AvatarVariant, AvatarAccountType } from '../../../../Avatars/Avatar';
import { AvatarProps } from '../../../../Avatars/Avatar/Avatar.types';

// Internal dependencies.
import { CellDisplayProps } from './CellDisplay.types';

// Sample consts
const SAMPLE_CELLDISPLAY_TITLE = 'Orangefox.eth';
const SAMPLE_CELLDISPLAY_SECONDARYTEXT =
  '0x2990079bcdEe240329a520d2444386FC119da21a';
const SAMPLE_CELLDISPLAY_TERTIARY_TEXT = 'Updated 1 sec ago';
const SAMPLE_CELLDISPLAY_TAGLABEL = 'Imported';
const SAMPLE_CELLDISPLAY_AVATARPROPS: AvatarProps = {
  variant: AvatarVariant.Account,
  accountAddress: '0x2990079bcdEe240329a520d2444386FC119da21a',
  type: AvatarAccountType.JazzIcon,
};

export const SAMPLE_CELLDISPLAY_PROPS: CellDisplayProps = {
  title: SAMPLE_CELLDISPLAY_TITLE,
  secondaryText: SAMPLE_CELLDISPLAY_SECONDARYTEXT,
  tertiaryText: SAMPLE_CELLDISPLAY_TERTIARY_TEXT,
  tagLabel: SAMPLE_CELLDISPLAY_TAGLABEL,
  avatarProps: SAMPLE_CELLDISPLAY_AVATARPROPS,
};
