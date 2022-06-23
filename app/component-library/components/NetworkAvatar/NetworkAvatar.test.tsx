import React from 'react';
import { shallow } from 'enzyme';
import { BaseAvatarSize } from '../BaseAvatar';
import NetworkAvatar from '.';
import { imageUrl } from './NetworkAvatar.samples';

describe('NetworkAvatar', () => {
  it('should render correctly', () => {
    const networkName = 'Ethereum';

    const wrapper = shallow(
      <NetworkAvatar
        size={BaseAvatarSize.Xl}
        networkName={networkName}
        networkImageUrl={imageUrl}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
