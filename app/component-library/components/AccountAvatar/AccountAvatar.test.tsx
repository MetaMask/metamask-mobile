import React from 'react';
import { shallow } from 'enzyme';

import { BaseAvatarSize } from '../BaseAvatar';
import AccountAvatar, { AccountAvatarType } from '.';

const accountAddress = 'sitean';

describe('BaseAvatar', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <AccountAvatar
        size={BaseAvatarSize.Xl}
        type={AccountAvatarType.JazzIcon}
        accountAddress={accountAddress}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
