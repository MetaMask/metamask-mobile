import React from 'react';
import { shallow } from 'enzyme';
import BaseAvatar, { AvatarSize } from '.';
import { toDataUrl } from 'app/util/blockies';
import { Image } from 'react-native';

describe('BaseAvatar', () => {
  it('should match the snapshot', () => {
    const stubAddress = '0x310ff9e227946749ca32aC146215F352183F556b';
    const wrapper = shallow(
      <BaseAvatar size={AvatarSize.ExtraLarge}>
        <Image
          source={{ uri: toDataUrl(stubAddress) }}
          // eslint-disable-next-line react-native/no-inline-styles
          style={{ width: '100%', height: '100%' }}
        />
      </BaseAvatar>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
