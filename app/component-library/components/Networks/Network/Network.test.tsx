// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import Network from './Network';
import { NetworkSizes } from './Network.types';
import {
  NETWORK_TEST_ID,
  NETWORK_IMAGE_TEST_ID,
  TEST_NETWORK_IMAGE_PROPS,
} from './Network.constants';

describe('Network - Snapshot', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Network size={NetworkSizes.Xl} imageProps={TEST_NETWORK_IMAGE_PROPS} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('Network', () => {
  it('should render Network component', () => {
    const wrapper = shallow(
      <Network size={NetworkSizes.Xl} imageProps={TEST_NETWORK_IMAGE_PROPS} />,
    );
    const networkComponent = wrapper.findWhere(
      (node) => node.prop('testID') === NETWORK_TEST_ID,
    );
    const networkImageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === NETWORK_IMAGE_TEST_ID,
    );
    expect(networkComponent.exists()).toBe(true);
    expect(networkImageComponent.exists()).toBe(true);
  });
});
