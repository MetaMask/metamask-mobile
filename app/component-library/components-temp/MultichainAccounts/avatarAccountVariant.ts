import { AvatarAccountVariant } from '@metamask/design-system-react-native';

export type LegacyAvatarAccountType = 'JazzIcon' | 'Blockies' | 'Maskicon';

export type AccountAvatarVariant =
  | AvatarAccountVariant
  | LegacyAvatarAccountType;

export const AvatarAccountType = {
  JazzIcon: AvatarAccountVariant.Jazzicon,
  Blockies: AvatarAccountVariant.Blockies,
  Maskicon: AvatarAccountVariant.Maskicon,
} as const;

export type AvatarAccountType =
  (typeof AvatarAccountType)[keyof typeof AvatarAccountType];

export const getAvatarAccountVariant = (
  avatarAccountType: AccountAvatarVariant,
): AvatarAccountVariant => {
  switch (avatarAccountType) {
    case 'JazzIcon':
    case AvatarAccountVariant.Jazzicon:
      return AvatarAccountVariant.Jazzicon;
    case 'Blockies':
    case AvatarAccountVariant.Blockies:
      return AvatarAccountVariant.Blockies;
    case 'Maskicon':
    case AvatarAccountVariant.Maskicon:
    default:
      return AvatarAccountVariant.Maskicon;
  }
};
