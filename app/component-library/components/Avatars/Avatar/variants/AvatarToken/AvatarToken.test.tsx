// Third party dependencies.
import React from 'react';
import { screen, fireEvent, render } from '@testing-library/react-native';

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
    const wrapper = render(<AvatarToken {...SAMPLE_AVATARTOKEN_PROPS} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should render remote network image', () => {
    render(<AvatarToken {...SAMPLE_AVATARTOKEN_PROPS} />);

    const imageComponent = screen.getByTestId(AVATARTOKEN_IMAGE_TESTID);
    expect(imageComponent).toBeTruthy();
  });

  it('should render local network image', () => {
    render(
      <AvatarToken
        {...SAMPLE_AVATARTOKEN_PROPS}
        imageSource={SAMPLE_AVATARTOKEN_IMAGESOURCE_LOCAL}
      />,
    );

    const imageComponent = screen.getByTestId(AVATARTOKEN_IMAGE_TESTID);
    expect(imageComponent).toBeTruthy();
  });

  it('should render fallback when image fails to load', () => {
    render(<AvatarToken {...SAMPLE_AVATARTOKEN_PROPS} />);

    const prevImageComponent = screen.getByTestId(AVATARTOKEN_IMAGE_TESTID);

    // Simulate onError on Image component
    fireEvent(prevImageComponent, 'onError', {
      nativeEvent: { error: 'ERROR!' },
    });
    const currentImageComponent = screen.queryByTestId(
      AVATARTOKEN_IMAGE_TESTID,
    );
    expect(currentImageComponent).toBeNull();
  });

  it('should render fallback when tokenImageUrl is not provided', () => {
    render(<AvatarToken name={SAMPLE_AVATARTOKEN_PROPS.name} />);

    const imageComponent = screen.queryByTestId(AVATARTOKEN_IMAGE_TESTID);
    expect(imageComponent).toBeNull();
  });
});
