import React from 'react';
import { shallow } from 'enzyme';

import { AvatarSize } from '../../Base/BaseAvatar';
import AccountAvatar, { AccountAvatarType } from '.';

const accountAddress = 'sitean';

describe('BaseAvatar', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <AccountAvatar
        size={AvatarSize.ExtraLarge}
        type={AccountAvatarType.JazzIcon}
        accountAddress={accountAddress}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
