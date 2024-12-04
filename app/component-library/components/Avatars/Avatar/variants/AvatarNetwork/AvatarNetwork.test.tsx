// Third party dependencies.
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';

// Internal dependencies.
import AvatarNetwork from './AvatarNetwork';
import {
  AVATARNETWORK_IMAGE_TESTID,
  SAMPLE_AVATARNETWORK_PROPS,
  SAMPLE_AVATARNETWORK_IMAGESOURCE_LOCAL,
} from './AvatarNetwork.constants';

describe('AvatarNetwork', () => {
  it('should render correctly', () => {
    const wrapper = render(<AvatarNetwork {...SAMPLE_AVATARNETWORK_PROPS} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should render remote network image', () => {
    render(<AvatarNetwork {...SAMPLE_AVATARNETWORK_PROPS} />);

    const imageComponent = screen.getByTestId(AVATARNETWORK_IMAGE_TESTID);
    expect(imageComponent).toBeTruthy();
  });

  it('should render local network image', () => {
    render(
      <AvatarNetwork
        {...SAMPLE_AVATARNETWORK_PROPS}
        imageSource={SAMPLE_AVATARNETWORK_IMAGESOURCE_LOCAL}
      />,
    );

    const imageComponent = screen.getByTestId(AVATARNETWORK_IMAGE_TESTID);
    expect(imageComponent).toBeTruthy();
  });

  it('should render fallback when image fails to load', () => {
    render(<AvatarNetwork {...SAMPLE_AVATARNETWORK_PROPS} />);

    const prevImageComponent = screen.getByTestId(AVATARNETWORK_IMAGE_TESTID);
    // Simulate onError on Image component
    fireEvent(prevImageComponent, 'onError', {
      nativeEvent: { error: 'ERROR!' },
    });

    const currentImageComponent = screen.queryByTestId(
      AVATARNETWORK_IMAGE_TESTID,
    );
    expect(currentImageComponent).toBeNull();
  });

  it('should render fallback when image is not provided', () => {
    render(<AvatarNetwork name={SAMPLE_AVATARNETWORK_PROPS.name} />);

    const imageComponent = screen.queryByTestId(AVATARNETWORK_IMAGE_TESTID);
    expect(imageComponent).toBeNull();
  });
});
