import React from 'react';
import { shallow } from 'enzyme';
import { BaseAvatarSize } from '../BaseAvatar';
import AccountAvatar, { AccountAvatarType } from '.';

describe('AccountAvatar', () => {
  it('should render correctly', () => {
    const accountAddress =
      '0x10e08af911f2e489480fb2855b24771745d0198b50f5c55891369844a8c57092';

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
