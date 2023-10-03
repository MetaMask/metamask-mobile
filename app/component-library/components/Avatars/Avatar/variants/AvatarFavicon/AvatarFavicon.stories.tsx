/* eslint-disable react/display-name */
// External dependencies.
import { AvatarSize } from '../../Avatar.types';

// Internal dependencies.
import { default as AvatarFaviconComponent } from './AvatarFavicon';
import { SAMPLE_AVATARFAVICON_PROPS } from './AvatarFavicon.constants';

const AvatarFaviconMeta = {
  title: 'Component Library / Avatars',
  component: AvatarFaviconComponent,
  argTypes: {
    size: {
      options: AvatarSize,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_AVATARFAVICON_PROPS.size,
    },
  },
};
export default AvatarFaviconMeta;

export const AvatarFavicon = {
  args: {
    imageSource: SAMPLE_AVATARFAVICON_PROPS.imageSource,
  },
};
