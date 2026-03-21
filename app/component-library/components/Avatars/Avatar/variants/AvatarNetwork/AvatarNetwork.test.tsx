// Third party dependencies.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

// Internal dependencies.
import AvatarNetwork from './AvatarNetwork';
import {
  AVATARNETWORK_IMAGE_TESTID,
  SAMPLE_AVATARNETWORK_PROPS,
  SAMPLE_AVATARNETWORK_IMAGESOURCE_LOCAL,
} from './AvatarNetwork.constants';

describe('AvatarNetwork', () => {
  it('should render correctly', () => {
    const { toJSON } = render(<AvatarNetwork {...SAMPLE_AVATARNETWORK_PROPS} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render remote network image', () => {
    render(<AvatarNetwork {...SAMPLE_AVATARNETWORK_PROPS} />);

    expect(screen.getByTestId(AVATARNETWORK_IMAGE_TESTID)).toBeDefined();
  });

  it('should render local network image', () => {
    render(
      <AvatarNetwork
        {...SAMPLE_AVATARNETWORK_PROPS}
        imageSource={SAMPLE_AVATARNETWORK_IMAGESOURCE_LOCAL}
      />,
    );

    expect(screen.getByTestId(AVATARNETWORK_IMAGE_TESTID)).toBeDefined();
  });

  it('should render fallback when image fails to load', () => {
    render(<AvatarNetwork {...SAMPLE_AVATARNETWORK_PROPS} />);
    const prevImageComponent = screen.getByTestId(AVATARNETWORK_IMAGE_TESTID);
    // Simulate onError on Image component
    fireEvent(prevImageComponent, 'error', { nativeEvent: { error: 'ERROR!' } });
    expect(screen.queryByTestId(AVATARNETWORK_IMAGE_TESTID)).toBeNull();
  });

  it('should render fallback when image is not provided', () => {
    render(
      <AvatarNetwork name={SAMPLE_AVATARNETWORK_PROPS.name} />,
    );
    expect(screen.queryByTestId(AVATARNETWORK_IMAGE_TESTID)).toBeNull();
  });
});
