import React from 'react';
import { shallow } from 'enzyme';
import { AvatarSize } from '../Avatar';
import AvatarAccount, { AvatarAccountType } from '.';

describe('AvatarAccount', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <AvatarAccount
        size={AvatarSize.Xl}
        type={AvatarAccountType.JazzIcon}
        accountAddress={accountAddress}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
