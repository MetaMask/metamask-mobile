// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { AvatarSizes } from '../../../../../../component-library/components/Avatars/Avatar';

// Internal dependencies.
import AvatarFavicon from './AvatarFavicon';
import { TEST_REMOTE_IMAGE_SOURCE } from './AvatarFavicon.constants';

describe('AvatarFavicon', () => {
  it('should match the snapshot', () => {
    const wrapper = shallow(
      <AvatarFavicon
        size={AvatarSizes.Xl}
        imageSource={TEST_REMOTE_IMAGE_SOURCE}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
