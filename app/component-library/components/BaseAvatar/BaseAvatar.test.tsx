import React from 'react';
import { shallow } from 'enzyme';
import BaseAvatar, { AvatarSize } from '.';
import { toDataUrl } from '../../../util/blockies';
import { Image } from 'react-native';

describe('BaseAvatar', () => {
  it('should render correctly', () => {
    const stubAddress = '0x310ff9e227946749ca32aC146215F352183F556b';
    const blockieStyles = {
      width: '100%',
      height: '100%',
    };
    const wrapper = shallow(
      <BaseAvatar size={AvatarSize.Xl}>
        <Image source={{ uri: toDataUrl(stubAddress) }} style={blockieStyles} />
      </BaseAvatar>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
