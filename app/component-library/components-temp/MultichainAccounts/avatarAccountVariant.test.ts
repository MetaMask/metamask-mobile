import { AvatarAccountVariant } from '@metamask/design-system-react-native';
import {
  type AccountAvatarVariant,
  AvatarAccountType,
  getAvatarAccountVariant,
} from './avatarAccountVariant';

const avatarVariantCases: [AccountAvatarVariant, AvatarAccountVariant][] = [
  ['JazzIcon', AvatarAccountVariant.Jazzicon],
  ['Blockies', AvatarAccountVariant.Blockies],
  ['Maskicon', AvatarAccountVariant.Maskicon],
  [AvatarAccountVariant.Jazzicon, AvatarAccountVariant.Jazzicon],
  [AvatarAccountVariant.Blockies, AvatarAccountVariant.Blockies],
  [AvatarAccountVariant.Maskicon, AvatarAccountVariant.Maskicon],
];

describe('avatarAccountVariant', () => {
  it.each(avatarVariantCases)(
    'maps %s to the matching DS avatar variant',
    (input, expected) => {
      expect(getAvatarAccountVariant(input)).toBe(expected);
    },
  );

  it('defaults to Maskicon for unknown avatar variants', () => {
    expect(getAvatarAccountVariant('Unknown' as AccountAvatarVariant)).toBe(
      AvatarAccountVariant.Maskicon,
    );
  });

  it('exposes legacy avatar type names with DS variant values', () => {
    expect(AvatarAccountType).toEqual({
      JazzIcon: AvatarAccountVariant.Jazzicon,
      Blockies: AvatarAccountVariant.Blockies,
      Maskicon: AvatarAccountVariant.Maskicon,
    });
  });
});
