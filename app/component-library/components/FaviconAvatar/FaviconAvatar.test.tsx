import React from 'react';
import { shallow } from 'enzyme';

import { BaseAvatarSize } from '../BaseAvatar';
import FaviconAvatar from '.';

describe('FaviconAvatar', () => {
  it('should match the snapshot', () => {
    const imageStub = 'image-stub';
    const wrapper = shallow(
      <FaviconAvatar size={BaseAvatarSize.Xl} imageUrl={imageStub} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
