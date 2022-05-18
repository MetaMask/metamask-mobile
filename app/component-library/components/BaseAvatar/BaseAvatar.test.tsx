import React from 'react';
import { Image } from 'react-native';
import { shallow } from 'enzyme';
import { toDataUrl } from '../../../util/blockies';
import BaseAvatar, { BaseAvatarSize } from '.';

describe('BaseAvatar', () => {
  it('should render correctly', () => {
    const stubAddress = '0x310ff9e227946749ca32aC146215F352183F556b';
    const blockieStyles = {
      flex: 1,
    };
    const wrapper = shallow(
      <BaseAvatar size={BaseAvatarSize.Xl}>
        <Image source={{ uri: toDataUrl(stubAddress) }} style={blockieStyles} />
      </BaseAvatar>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
