/* eslint-disable react/display-name */
// External dependencies.
import { AvatarSize } from '../../Avatar.types';
import { IconName, IconColor } from '../../../../Icons/Icon';

// Internal dependencies.
import { default as AvatarIconComponent } from './AvatarIcon';
import { SAMPLE_AVATARICON_PROPS } from './AvatarIcon.constants';

const AvatarIconMeta = {
  title: 'Component Library / Avatars',
  component: AvatarIconComponent,
  argTypes: {
    size: {
      options: AvatarSize,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_AVATARICON_PROPS.size,
    },
    name: {
      options: IconName,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_AVATARICON_PROPS.name,
    },
    iconColor: {
      options: IconColor,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_AVATARICON_PROPS.iconColor,
    },
    backgroundColor: {
      control: {
        type: 'color',
      },
      defaultValue: SAMPLE_AVATARICON_PROPS.backgroundColor,
    },
  },
};
export default AvatarIconMeta;

export const AvatarIcon = {};
