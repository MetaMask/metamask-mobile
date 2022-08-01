import React from 'react';
import { Image } from 'react-native';
import { shallow } from 'enzyme';
import { toDataUrl } from '../../../util/blockies';
import Avatar, { AvatarSize } from '.';
import { DUMMY_WALLET_ADDRESS } from './Avatar.constants';

describe('Avatar', () => {
  it('should render correctly', () => {
    const blockieStyles = {
      flex: 1,
    };
    const wrapper = shallow(
      <Avatar size={AvatarSize.Xl}>
        <Image
          source={{ uri: toDataUrl(DUMMY_WALLET_ADDRESS) }}
          style={blockieStyles}
        />
      </Avatar>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
