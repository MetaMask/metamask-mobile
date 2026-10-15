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
      defaultValue: FoxiconVariant.Base,
    },
    backgroundColor: {
      options: AvatarSocialBackgroundColor,
      control: {
        type: 'select',
      },
      defaultValue: AvatarSocialBackgroundColor.Orange,
    },
    size: {
      options: AvatarBaseSize,
      control: {
        type: 'select',
      },
      defaultValue: AvatarBaseSize.Md,
    },
    shape: {
      options: AvatarBaseShape,
      control: {
        type: 'select',
      },
      defaultValue: AvatarBaseShape.Circle,
    },
  },
};
export default AvatarSocialMeta;

export const AvatarSocial = {};
