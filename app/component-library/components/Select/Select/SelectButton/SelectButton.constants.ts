/* eslint-disable import/prefer-default-export */
// External dependencies.
import { TextVariant, TextColor } from '../../../Texts/Text';
import { VerticalAlignment } from '../../../../base-components/ListItem/BaseListItem/foundation/BaseListItemBase';
import { AvatarSize } from '../../../Avatars/Avatar';
import { SelectButtonSize } from '../../../../base-components/Select/BaseSelectButton';
import { SAMPLE_LISTITEM_PROPS } from '../../../ListItem/ListItem/ListItem.constants';

// Internal dependencies.
import {
  SelectButtonProps,
  StartIconIconSizeBySelectButtonSize,
} from './SelectButton.types';

// Defaults
export const DEFAULT_SELECTBUTTON_GAP = 8;
export const DEFAULT_SELECTBUTTON_VERTICALALIGNMENT = VerticalAlignment.Center;
export const DEFAULT_SELECTBUTTON_SIZE = SelectButtonSize.Md;
export const DEFAULT_SELECTBUTTON_TITLE_TEXTVARIANT = TextVariant.BodyMD;
export const DEFAULT_SELECTBUTTON_TITLE_TEXTCOLOR = TextColor.Default;
export const DEFAULT_SELECTBUTTON_DESCRIPTION_TEXTVARIANT = TextVariant.BodySM;
export const DEFAULT_SELECTBUTTON_DESCRIPTION_TEXTCOLOR = TextColor.Alternative;

// Test IDs
export const SELECTBUTTON_TESTID = 'selectbutton';

// Mappings
export const STARTICON_ICONSIZE_BY_SELECTBUTTONSIZE: StartIconIconSizeBySelectButtonSize =
  {
    [SelectButtonSize.Sm]: AvatarSize.Xs,
    [SelectButtonSize.Md]: AvatarSize.Sm,
    [SelectButtonSize.Lg]: AvatarSize.Sm,
  };

// Sample consts
export const SAMPLE_SELECTBUTTON_PROPS: SelectButtonProps = {
  value: SAMPLE_LISTITEM_PROPS,
  size: DEFAULT_SELECTBUTTON_SIZE,
  isDisabled: false,
  isDanger: false,
};
