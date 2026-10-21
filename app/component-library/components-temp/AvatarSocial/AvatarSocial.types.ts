import { AvatarBaseProps } from '@metamask/design-system-react-native';

import { FoxiconProps } from '../Foxicon';

export const AvatarSocialBackgroundColor = {
  Background1: 'background1',
  Background2: 'background2',
  Background3: 'background3',
  Background4: 'background4',
  Background5: 'background5',
  Background6: 'background6',
  Background7: 'background7',
} as const;

export type AvatarSocialBackgroundColor =
  (typeof AvatarSocialBackgroundColor)[keyof typeof AvatarSocialBackgroundColor];

/**
 * AvatarSocial component props.
 */
export interface AvatarSocialProps
  extends Omit<
      AvatarBaseProps,
      'children' | 'fallbackText' | 'fallbackTextProps'
    >,
    Omit<FoxiconProps, 'size'> {
  /**
   * The background color slot for the avatar.
   */
  backgroundColor: AvatarSocialBackgroundColor;
}
