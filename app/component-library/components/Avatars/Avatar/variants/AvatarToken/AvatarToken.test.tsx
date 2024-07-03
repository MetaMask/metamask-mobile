// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import AvatarToken from './AvatarToken';
import {
  AVATARTOKEN_IMAGE_TESTID,
  SAMPLE_AVATARTOKEN_PROPS,
  SAMPLE_AVATARTOKEN_IMAGESOURCE_LOCAL,
} from './AvatarToken.constants';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

describe('AvatarToken', () => {
  it('should render correctly', () => {
    const { toJSON } = render(<AvatarToken {...SAMPLE_AVATARTOKEN_PROPS} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render remote network image', () => {
    const { toJSON } = render(<AvatarToken {...SAMPLE_AVATARTOKEN_PROPS} />);

    const imageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATARTOKEN_IMAGE_TESTID,
    );
    expect(imageComponent.exists()).toBe(true);
  });

  it('should render local network image', () => {
    const { toJSON } = render(
      <AvatarToken
        {...SAMPLE_AVATARTOKEN_PROPS}
        imageSource={SAMPLE_AVATARTOKEN_IMAGESOURCE_LOCAL}
      />,
    );

    const imageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATARTOKEN_IMAGE_TESTID,
    );
    expect(imageComponent.exists()).toBe(true);
  });

  it('should render fallback when image fails to load', () => {
    const { toJSON } = render(<AvatarToken {...SAMPLE_AVATARTOKEN_PROPS} />);
    const prevImageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATARTOKEN_IMAGE_TESTID,
    );
    // Simulate onError on Image component
    prevImageComponent.props().onError({ nativeEvent: { error: 'ERROR!' } });
    const currentImageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATARTOKEN_IMAGE_TESTID,
    );
    expect(currentImageComponent.exists()).toBe(false);
  });

  it('should render fallback when tokenImageUrl is not provided', () => {
    const { toJSON } = render(
      <AvatarToken name={SAMPLE_AVATARTOKEN_PROPS.name} />,
    );
    const imageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATARTOKEN_IMAGE_TESTID,
    );
    expect(imageComponent.exists()).toBe(false);
  });
});
