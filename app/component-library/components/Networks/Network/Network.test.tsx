// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { NetworkSizes } from './Network.types';

// Internal dependencies.
import Network from './Network';
import {
  TEST_NETWORK_NAME,
  TEST_REMOTE_IMAGE_PROPS,
} from './Network.constants';

describe('Network', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Network
        size={NetworkSizes.Xl}
        name={TEST_NETWORK_NAME}
        imageProps={TEST_REMOTE_IMAGE_PROPS}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
