import React from 'react';
import { Image } from 'react-native';
import { shallow } from 'enzyme';
import { BaseAvatarSize } from '../BaseAvatar';
import TokenAvatar from './TokenAvatar';
import { TOKEN_AVATAR_IMAGE_ID } from '../../../constants/test-ids';
// eslint-disable-next-line
// @ts-ignore
import ethLogo from '../../../images/eth-logo.png';

describe('TokenAvatar', () => {
  const tokenName = 'Ethereum';
  // turns out this method returns an object with testUri key when on jest context
  // eslint-disable-next-line
  // @ts-ignore
  const testImageUrl = Image.resolveAssetSource(ethLogo).testUri;

  it('should render correctly', () => {
    const wrapper = shallow(
      <TokenAvatar
        size={BaseAvatarSize.Xl}
        tokenName={tokenName}
        tokenImageUrl={testImageUrl}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render network image', () => {
    const wrapper = shallow(
      <TokenAvatar
        size={BaseAvatarSize.Xl}
        tokenName={tokenName}
        tokenImageUrl={testImageUrl}
      />,
    );

    const imageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TOKEN_AVATAR_IMAGE_ID,
    );
    expect(imageComponent.exists()).toBe(true);
  });

  it('should render fallback when image fails to load', () => {
    const wrapper = shallow(
      <TokenAvatar
        size={BaseAvatarSize.Xl}
        tokenName={tokenName}
        tokenImageUrl={testImageUrl}
      />,
    );
    const prevImageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TOKEN_AVATAR_IMAGE_ID,
    );
    // Simulate onError on Image component
    prevImageComponent.props().onError({ nativeEvent: { error: 'ERROR!' } });
    const currentImageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TOKEN_AVATAR_IMAGE_ID,
    );
    expect(currentImageComponent.exists()).toBe(false);
  });

  it('should render fallback when tokenImageUrl is not provided', () => {
    const wrapper = shallow(
      <TokenAvatar size={BaseAvatarSize.Xl} tokenName={tokenName} />,
    );
    const imageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TOKEN_AVATAR_IMAGE_ID,
    );
    expect(imageComponent.exists()).toBe(false);
  });
});
