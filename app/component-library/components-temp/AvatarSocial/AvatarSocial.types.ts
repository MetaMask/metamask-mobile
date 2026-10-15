import { AvatarBaseProps } from '@metamask/design-system-react-native';

import { FoxiconProps } from '../Foxicon';

export const AvatarSocialBackgroundColor = {
  Orange: 'orange200',
  Purple: 'purple100',
  Purple2: 'purple300',
  Blue: 'indigo200',
  Blue2: 'indigo500',
  Green: 'lime025',
  Green2: 'lime100',
} as const;

export type AvatarSocialBackgroundColor =
  (typeof AvatarSocialBackgroundColor)[keyof typeof AvatarSocialBackgroundColor];

/**
 * AvatarSocial component props.
 */
export interface AvatarSocialProps
  extends Omit<AvatarBaseProps, 'children'>,
    Omit<FoxiconProps, 'size'> {
  /**
   * The brand color token used as the avatar's background color.
   */
  backgroundColor: AvatarSocialBackgroundColor;
}
