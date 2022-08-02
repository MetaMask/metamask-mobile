import React from 'react';
import { shallow } from 'enzyme';
import PickerAccount from './PickerAccount';
import {
  TEST_ACCOUNT_ADDRESS,
  TEST_ACCOUNT_NAME,
} from './PickerAccount.constants';
import { AvatarAccountType } from '../AvatarAccount';

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
