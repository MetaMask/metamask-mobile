// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { AvatarSizes } from '../../../../../../component-library/components/Avatars/Avatar';

// Internal dependencies.
import AvatarNetwork from './AvatarNetwork';
import {
  TEST_NETWORK_NAME,
  TEST_REMOTE_IMAGE_SOURCE,
} from './AvatarNetwork.constants';

describe('AvatarNetwork', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <AvatarNetwork
        size={AvatarSizes.Xl}
        name={TEST_NETWORK_NAME}
        imageSource={TEST_REMOTE_IMAGE_SOURCE}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
