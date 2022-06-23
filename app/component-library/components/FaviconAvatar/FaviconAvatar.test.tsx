import React from 'react';
import { shallow } from 'enzyme';
import { BaseAvatarSize } from '../BaseAvatar';
import FaviconAvatar from '.';
import { foxImageUri } from './FaviconAvatar.data';

describe('FaviconAvatar', () => {
  it('should match the snapshot', () => {
    const wrapper = shallow(
      <FaviconAvatar size={BaseAvatarSize.Xl} imageUrl={foxImageUri} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
