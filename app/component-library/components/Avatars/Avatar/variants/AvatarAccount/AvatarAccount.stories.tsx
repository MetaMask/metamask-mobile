/* eslint-disable react/display-name */
// External dependencies.
import { AvatarSize } from '../../Avatar.types';

// Internal dependencies.
import { default as AvatarAccountComponent } from './AvatarAccount';
import { SAMPLE_AVATARACCOUNT_PROPS } from './AvatarAccount.constants';
import { AvatarAccountType } from './AvatarAccount.types';

const AvatarAccountMeta = {
  title: 'Component Library / Avatars',
  component: AvatarAccountComponent,
  argTypes: {
    accountAddress: {
      control: { type: 'text' },
      defaultValue: SAMPLE_AVATARACCOUNT_PROPS.accountAddress,
    },
    type: {
      options: AvatarAccountType,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_AVATARACCOUNT_PROPS.type,
    },
    size: {
      options: AvatarSize,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_AVATARACCOUNT_PROPS.size,
    },
  },
};
export default AvatarAccountMeta;

export const AvatarAccount = {};
