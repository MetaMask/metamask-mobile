// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import AvatarFavicon from './AvatarFavicon';
import {
  AVATARFAVICON_IMAGE_TESTID,
  SAMPLE_AVATARFAVICON_PROPS,
  SAMPLE_AVATARFAVICON_IMAGESOURCE_LOCAL,
  SAMPLE_AVATARFAVICON_SVGIMAGESOURCE_REMOTE,
} from './AvatarFavicon.constants';

describe('AvatarFavicon', () => {
  it('should match the snapshot', () => {
    const wrapper = shallow(<AvatarFavicon {...SAMPLE_AVATARFAVICON_PROPS} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should render favicon with remote image', () => {
    const wrapper = shallow(<AvatarFavicon {...SAMPLE_AVATARFAVICON_PROPS} />);
    const imageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATARFAVICON_IMAGE_TESTID,
    );
    expect(imageComponent.exists()).toBe(true);
  });

  it('should render favicon with local image', () => {
    const wrapper = shallow(
      <AvatarFavicon
        {...SAMPLE_AVATARFAVICON_PROPS}
        imageSource={SAMPLE_AVATARFAVICON_IMAGESOURCE_LOCAL}
      />,
    );
    const imageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATARFAVICON_IMAGE_TESTID,
    );
    expect(imageComponent.exists()).toBe(true);
  });

  it('should render SVG', () => {
    const wrapper = shallow(
      <AvatarFavicon
        {...SAMPLE_AVATARFAVICON_PROPS}
        imageSource={SAMPLE_AVATARFAVICON_SVGIMAGESOURCE_REMOTE}
      />,
    );

    expect(wrapper).toMatchSnapshot();
  });

  it('should render fallback', () => {
    const wrapper = shallow(<AvatarFavicon {...SAMPLE_AVATARFAVICON_PROPS} />);
    const prevImageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATARFAVICON_IMAGE_TESTID,
    );
    // Simulate onError on Image component
    prevImageComponent.props().onError({ nativeEvent: { error: 'ERROR!' } });
    const currentImageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATARFAVICON_IMAGE_TESTID,
    );
    expect(currentImageComponent.exists()).toBe(false);
  });

  it('should render fallback when svg has error', () => {
    const wrapper = shallow(
      <AvatarFavicon
        {...SAMPLE_AVATARFAVICON_PROPS}
        imageSource={SAMPLE_AVATARFAVICON_SVGIMAGESOURCE_REMOTE}
      />,
    );
    const prevImageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATARFAVICON_IMAGE_TESTID,
    );
    // Simulate onError on Image component
    prevImageComponent.props().onError(new Error('ERROR!'));
    const currentImageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATARFAVICON_IMAGE_TESTID,
    );
    expect(currentImageComponent.exists()).toBe(true);
    expect(wrapper).toMatchSnapshot();
  });
});
