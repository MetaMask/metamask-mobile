import React from 'react';
import { shallow } from 'enzyme';

import { AvatarBaseSize } from '../AvatarBase';

import AvatarNetwork from './AvatarNetwork';
import {
  NETWORK_AVATAR_IMAGE_ID,
  TEST_IMAGE_URL,
} from './AvatarNetwork.constants';

describe('AvatarNetwork', () => {
  it('should render correctly', () => {
    const networkName = 'Ethereum';

    const wrapper = shallow(
      <AvatarNetwork
        size={AvatarBaseSize.Xl}
        networkName={networkName}
        networkImageUrl={TEST_IMAGE_URL}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render network image', () => {
    const wrapper = shallow(
      <AvatarNetwork
        size={AvatarBaseSize.Xl}
        networkName={'Ethereum'}
        networkImageUrl={TEST_IMAGE_URL}
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
        networkName={'Ethereum'}
        networkImageUrl={TEST_IMAGE_URL}
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

  it('should render fallback when networkImageUrl is not provided', () => {
    const wrapper = shallow(
      <AvatarNetwork size={AvatarBaseSize.Xl} networkName={'Ethereum'} />,
    );
    const imageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === NETWORK_AVATAR_IMAGE_ID,
    );
    expect(imageComponent.exists()).toBe(false);
  });
});
