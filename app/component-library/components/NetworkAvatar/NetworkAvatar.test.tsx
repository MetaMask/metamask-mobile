import React from 'react';
import { shallow } from 'enzyme';
import { AvatarSize } from '../Avatar';
import NetworkAvatar from './NetworkAvatar';
import { testImageUrl } from './NetworkAvatar.data';
import { NETWORK_AVATAR_IMAGE_ID } from '../../../constants/test-ids';

describe('NetworkAvatar', () => {
  it('should render correctly', () => {
    const networkName = 'Ethereum';

    const wrapper = shallow(
      <NetworkAvatar
        size={AvatarSize.Xl}
        networkName={networkName}
        networkImageUrl={testImageUrl}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render network image', () => {
    const wrapper = shallow(
      <NetworkAvatar
        size={AvatarSize.Xl}
        networkName={'Ethereum'}
        networkImageUrl={testImageUrl}
      />,
    );

    const imageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === NETWORK_AVATAR_IMAGE_ID,
    );
    expect(imageComponent.exists()).toBe(true);
  });

  it('should render fallback when image fails to load', () => {
    const wrapper = shallow(
      <NetworkAvatar
        size={AvatarSize.Xl}
        networkName={'Ethereum'}
        networkImageUrl={testImageUrl}
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
      <NetworkAvatar size={AvatarSize.Xl} networkName={'Ethereum'} />,
    );
    const imageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === NETWORK_AVATAR_IMAGE_ID,
    );
    expect(imageComponent.exists()).toBe(false);
  });
});
