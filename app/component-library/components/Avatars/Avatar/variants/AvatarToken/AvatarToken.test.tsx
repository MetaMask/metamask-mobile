// Third party dependencies.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

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
    render(<AvatarToken {...SAMPLE_AVATARTOKEN_PROPS} />);

    expect(screen.getByTestId(AVATARTOKEN_IMAGE_TESTID)).toBeDefined();
  });

  it('should render local network image', () => {
    render(
      <AvatarToken
        {...SAMPLE_AVATARTOKEN_PROPS}
        imageSource={SAMPLE_AVATARTOKEN_IMAGESOURCE_LOCAL}
      />,
    );

    expect(screen.getByTestId(AVATARTOKEN_IMAGE_TESTID)).toBeDefined();
  });

  it('should render fallback when image fails to load', () => {
    render(<AvatarToken {...SAMPLE_AVATARTOKEN_PROPS} />);
    const prevImageComponent = screen.getByTestId(AVATARTOKEN_IMAGE_TESTID);
    // Simulate onError on Image component
    fireEvent(prevImageComponent, 'error', { nativeEvent: { error: 'ERROR!' } });
    expect(screen.queryByTestId(AVATARTOKEN_IMAGE_TESTID)).toBeNull();
  });

  it('should render fallback when tokenImageUrl is not provided', () => {
    render(
      <AvatarToken name={SAMPLE_AVATARTOKEN_PROPS.name} />,
    );
    expect(screen.queryByTestId(AVATARTOKEN_IMAGE_TESTID)).toBeNull();
  });

  it('renders svg image', () => {
    const svgImageSource = {
      uri: 'https://example.com/token.svg',
    };
    const { toJSON } = render(
      <AvatarToken
        {...SAMPLE_AVATARTOKEN_PROPS}
        imageSource={svgImageSource}
      />,
    );

    // SvgUri is used for SVG images - verify it renders (SvgUri mock doesn't forward testID)
    const tree = toJSON();
    expect(tree).toBeTruthy();
    // Verify that the fallback text is NOT shown (meaning SVG path was taken)
    expect(screen.queryByText('W')).toBeNull();
  });
});
