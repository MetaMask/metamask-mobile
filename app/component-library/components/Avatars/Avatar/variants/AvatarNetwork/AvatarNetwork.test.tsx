// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import AvatarNetwork from './AvatarNetwork';
import {
  AVATARNETWORK_IMAGE_TESTID,
  SAMPLE_AVATARNETWORK_PROPS,
  SAMPLE_AVATARNETWORK_IMAGESOURCE_LOCAL,
} from './AvatarNetwork.constants';

describe('AvatarNetwork', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<AvatarNetwork {...SAMPLE_AVATARNETWORK_PROPS} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should render remote network image', () => {
    const wrapper = shallow(<AvatarNetwork {...SAMPLE_AVATARNETWORK_PROPS} />);

    const imageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATARNETWORK_IMAGE_TESTID,
    );
    expect(imageComponent.exists()).toBe(true);
  });

  it('should render local network image', () => {
    const wrapper = shallow(
      <AvatarNetwork
        {...SAMPLE_AVATARNETWORK_PROPS}
        imageSource={SAMPLE_AVATARNETWORK_IMAGESOURCE_LOCAL}
      />,
    );

    const imageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATARNETWORK_IMAGE_TESTID,
    );
    expect(imageComponent.exists()).toBe(true);
  });

  it('should render fallback when image fails to load', () => {
    const wrapper = shallow(<AvatarNetwork {...SAMPLE_AVATARNETWORK_PROPS} />);
    const prevImageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATARNETWORK_IMAGE_TESTID,
    );
    // Simulate onError on Image component
    prevImageComponent.props().onError({ nativeEvent: { error: 'ERROR!' } });
    const currentImageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATARNETWORK_IMAGE_TESTID,
    );
    expect(currentImageComponent.exists()).toBe(false);
  });

  it('should render fallback when image is not provided', () => {
    const wrapper = shallow(
      <AvatarNetwork name={SAMPLE_AVATARNETWORK_PROPS.name} />,
    );
    const imageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATARNETWORK_IMAGE_TESTID,
    );
    expect(imageComponent.exists()).toBe(false);
  });
});
