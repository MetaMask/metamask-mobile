import React from 'react';
import { shallow } from 'enzyme';

import { AvatarBaseSize } from '../AvatarBase';

import AvatarAccount from './AvatarAccount';
import { AvatarAccountType } from './AvatarAccount.types';
import { DUMMY_WALLET_ADDRESS } from './AvatarAccount.constants';

describe('AvatarAccount', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <AvatarAccount
        size={AvatarBaseSize.Xl}
        type={AvatarAccountType.JazzIcon}
        accountAddress={DUMMY_WALLET_ADDRESS}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
