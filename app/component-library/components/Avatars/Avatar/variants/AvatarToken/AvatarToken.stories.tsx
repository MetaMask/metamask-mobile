/* eslint-disable react/display-name */
// External dependencies.
import { AvatarSize } from '../../Avatar.types';

// Internal dependencies.
import { default as AvatarTokenComponent } from './AvatarToken';
import { SAMPLE_AVATARTOKEN_PROPS } from './AvatarToken.constants';

const AvatarTokenMeta = {
  title: 'Component Library / Avatars',
  component: AvatarTokenComponent,
  argTypes: {
    size: {
      options: AvatarSize,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_AVATARTOKEN_PROPS.size,
    },
    name: {
      control: { type: 'text' },
      defaultValue: SAMPLE_AVATARTOKEN_PROPS.name,
    },
  },
};
export default AvatarTokenMeta;

export const AvatarToken = {
  args: {
    imageSource: SAMPLE_AVATARTOKEN_PROPS.imageSource,
    isIpfsGatewayCheckBypassed: true,
  },
};
