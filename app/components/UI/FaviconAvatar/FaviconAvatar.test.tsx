import React from 'react';
import { shallow } from 'enzyme';

import { AvatarSize } from '../../Base/BaseAvatar';
import FaviconAvatar from '.';

describe('BaseAvatar', () => {
  it('should match the snapshot', () => {
    const imageStub = 'image-stub';
    const wrapper = shallow(
      <FaviconAvatar size={AvatarSize.Xl} imageUrl={imageStub} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
