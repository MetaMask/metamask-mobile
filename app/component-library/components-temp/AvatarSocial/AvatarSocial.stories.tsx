// External dependencies.
import {
  AvatarBaseShape,
  AvatarBaseSize,
} from '@metamask/design-system-react-native';
import { FoxiconVariant } from '../Foxicon';

// Internal dependencies.
import { default as AvatarSocialComponent } from './AvatarSocial';
import { AvatarSocialBackgroundColor } from './AvatarSocial.types';

const AvatarSocialMeta = {
  title: 'Components Temp / AvatarSocial',
  component: AvatarSocialComponent,
  argTypes: {
    variant: {
      options: FoxiconVariant,
      control: {
        type: 'select',
      },
    },
    backgroundColor: {
      options: AvatarSocialBackgroundColor,
      control: {
        type: 'select',
      },
    },
    size: {
      options: AvatarBaseSize,
      control: {
        type: 'select',
      },
    },
    shape: {
      options: AvatarBaseShape,
      control: {
        type: 'select',
      },
    },
  },
  args: {
    variant: FoxiconVariant.Base,
    backgroundColor: AvatarSocialBackgroundColor.Background1,
    size: AvatarBaseSize.Md,
    shape: AvatarBaseShape.Circle,
  },
};
export default AvatarSocialMeta;

export const AvatarSocial = {};
