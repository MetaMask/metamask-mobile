// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';
import Engine from '../../../../core/Engine';

// External dependencies.
import { AvatarAccountType } from '../../Avatars/Avatar/variants/AvatarAccount';

// Internal dependencies.
import PickerAccount from './PickerAccount';
import {
  TEST_ACCOUNT_ADDRESS,
  TEST_ACCOUNT_NAME,
} from './PickerAccount.constants';


jest.mock('../../../../core/Engine', () => ({
  context: {
    KeyringController: {
      state: {
        keyrings: [
          {
            accounts: ['0x2990079bcdEe240329a520d2444386FC119da21a']
          }
        ]
      }
    }
  },
}));

describe('PickerAccount', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <PickerAccount
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountName={TEST_ACCOUNT_NAME}
        accountAvatarType={AvatarAccountType.JazzIcon}
        onPress={jest.fn}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
