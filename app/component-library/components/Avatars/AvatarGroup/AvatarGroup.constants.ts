/* eslint-disable import/prefer-default-export */

// External dependencies
import { AvatarSize, AvatarProps, AvatarVariant } from '../Avatar/Avatar.types';
import { TextVariant, TextColor } from '../../Texts/Text';
import { SAMPLE_AVATARACCOUNT_PROPS } from '../Avatar/variants/AvatarAccount/AvatarAccount.constants';
import { SAMPLE_AVATARNETWORK_PROPS } from '../Avatar/variants/AvatarNetwork/AvatarNetwork.constants';
import { SAMPLE_AVATARICON_PROPS } from '../Avatar/variants/AvatarIcon/AvatarIcon.constants';
import { SAMPLE_AVATARFAVICON_PROPS } from '../Avatar/variants/AvatarFavicon/AvatarFavicon.constants';
import { SAMPLE_AVATARTOKEN_PROPS } from '../Avatar/variants/AvatarToken/AvatarToken.constants';

// Internal dependencies
import {
  AvatarGroupProps,
  TextVariantByAvatarSize,
  OverflowTextMarginByAvatarSize,
} from './AvatarGroup.types';

// Test IDs
export const AVATARGROUP_AVATAR_TESTID = 'avatargroup-avatar';
export const AVATARGROUP_OVERFLOWCOUNTER_TESTID = 'avatargroup-overflowcounter';

// Mappings
export const TEXTVARIANT_BY_AVATARSIZE: TextVariantByAvatarSize = {
  [AvatarSize.Xs]: TextVariant.BodySM,
  [AvatarSize.Sm]: TextVariant.BodyMD,
  [AvatarSize.Md]: TextVariant.BodyMD,
  [AvatarSize.Lg]: TextVariant.BodyLGMedium,
  [AvatarSize.Xl]: TextVariant.BodyLGMedium,
};
export const OVERFLOWTEXTMARGIN_BY_AVATARSIZE: OverflowTextMarginByAvatarSize =
  {
    [AvatarSize.Xs]: 2,
    [AvatarSize.Sm]: 4,
    [AvatarSize.Md]: 4,
    [AvatarSize.Lg]: 6,
    [AvatarSize.Xl]: 6,
  };

// Defaults
export const DEFAULT_AVATARGROUP_AVATARSIZE = AvatarSize.Xs;
export const DEFAULT_AVATARGROUP_MAXSTACKEDAVATARS = 4;
export const DEFAULT_AVATARGROUP_COUNTER_TEXTCOLOR = TextColor.Alternative;

// Sample consts
const SAMPLE_AVATARGROUP_AVATARPROPSLIST: AvatarProps[] = [
  {
    variant: AvatarVariant.Icon,
    ...SAMPLE_AVATARICON_PROPS,
  },
  {
    variant: AvatarVariant.Token,
    ...SAMPLE_AVATARTOKEN_PROPS,
  },
  {
    variant: AvatarVariant.Favicon,
    ...SAMPLE_AVATARFAVICON_PROPS,
  },
  {
    variant: AvatarVariant.Account,
    ...SAMPLE_AVATARACCOUNT_PROPS,
  },
  {
    variant: AvatarVariant.Network,
    ...SAMPLE_AVATARNETWORK_PROPS,
  },
];
export const SAMPLE_AVATARGROUP_PROPS: AvatarGroupProps = {
  avatarPropsList: SAMPLE_AVATARGROUP_AVATARPROPSLIST,
  size: DEFAULT_AVATARGROUP_AVATARSIZE,
  maxStackedAvatars: DEFAULT_AVATARGROUP_MAXSTACKEDAVATARS,
};
