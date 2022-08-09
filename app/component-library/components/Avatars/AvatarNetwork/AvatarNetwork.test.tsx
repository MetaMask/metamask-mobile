// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { AvatarBaseSize } from '../AvatarBase';

// Internal dependencies.
import AvatarNetwork from './AvatarNetwork';
import {
  NETWORK_AVATAR_IMAGE_ID,
  TEST_IMAGE_SOURCE,
} from './AvatarNetwork.constants';

describe('AvatarNetwork', () => {
  const networkName = 'Ethereum';

  it('should render correctly', () => {
    const wrapper = shallow(
      <AvatarNetwork
        size={AvatarBaseSize.Xl}
        name={networkName}
        imageSource={TEST_IMAGE_SOURCE}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render network image', () => {
    const wrapper = shallow(
      <AvatarNetwork
        size={AvatarBaseSize.Xl}
        name={networkName}
        imageSource={TEST_IMAGE_SOURCE}
      />,
    );

    const imageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === NETWORK_AVATAR_IMAGE_ID,
    );
    expect(imageComponent.exists()).toBe(true);
  });

  it('should render fallback when image fails to load', () => {
    const wrapper = shallow(
      <AvatarNetwork
        size={AvatarBaseSize.Xl}
        name={networkName}
        imageSource={TEST_IMAGE_SOURCE}
      />,
    );
    const prevImageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === NETWORK_AVATAR_IMAGE_ID,
    );
    // Simulate onError on Image component
    prevImageComponent.props().onError({ nativeEvent: { error: 'ERROR!' } });
    const currentImageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === NETWORK_AVATAR_IMAGE_ID,
    );
    expect(currentImageComponent.exists()).toBe(false);
  });

  it('should render fallback when image is not provided', () => {
    const wrapper = shallow(
      <AvatarNetwork size={AvatarBaseSize.Xl} name={networkName} />,
    );
    const imageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === NETWORK_AVATAR_IMAGE_ID,
    );
    expect(imageComponent.exists()).toBe(false);
  });
});
