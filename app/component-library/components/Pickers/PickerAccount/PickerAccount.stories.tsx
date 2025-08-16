/* eslint-disable react/display-name */
// External dependencies.
import { AvatarAccountType } from '../../Avatars/Avatar/variants/AvatarAccount';

// Internal dependencies.
import { default as PickerAccountComponent } from './PickerAccount';
import { SAMPLE_PICKERACCOUNT_PROPS } from './PickerAccount.constants';

const PickerAccountMeta = {
  title: 'Component Library / Pickers',
  component: PickerAccountComponent,
  argTypes: {
    accountAddress: {
      control: { type: 'text' },
      defaultValue: SAMPLE_PICKERACCOUNT_PROPS.accountAddress,
    },
    accountAvatarType: {
      options: AvatarAccountType,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_PICKERACCOUNT_PROPS.accountAvatarType,
    },
    accountName: {
      control: { type: 'text' },
      defaultValue: SAMPLE_PICKERACCOUNT_PROPS.accountName,
    },
    showAddress: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_PICKERACCOUNT_PROPS.showAddress,
    },
  },
};
export default PickerAccountMeta;

export const PickerAccount = {};
