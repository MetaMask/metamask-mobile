import React from 'react';
import { shallow } from 'enzyme';
import { NetworksChainId } from '@metamask/controllers';
import { BaseAvatarSize } from '../BaseAvatar';
import NetworkAvatar from '.';

describe('NetworkAvatar', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <NetworkAvatar
        size={BaseAvatarSize.Xl}
        chainId={NetworksChainId.mainnet}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
