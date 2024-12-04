// Third party dependencies.
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';

// Internal dependencies.
import AvatarFavicon from './AvatarFavicon';
import {
  AVATARFAVICON_IMAGE_TESTID,
  SAMPLE_AVATARFAVICON_PROPS,
  SAMPLE_AVATARFAVICON_IMAGESOURCE_LOCAL,
  SAMPLE_AVATARFAVICON_SVGIMAGESOURCE_REMOTE,
} from './AvatarFavicon.constants';
import { queryByTestId } from '@testing-library/react';

describe('AvatarFavicon', () => {
  it('should match the snapshot', () => {
    const wrapper = render(<AvatarFavicon {...SAMPLE_AVATARFAVICON_PROPS} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should render favicon with remote image', () => {
    render(<AvatarFavicon {...SAMPLE_AVATARFAVICON_PROPS} />);

    const imageComponent = screen.getByTestId(AVATARFAVICON_IMAGE_TESTID);
    expect(imageComponent).toBeTruthy();
  });

  it('should render favicon with local image', () => {
    render(
      <AvatarFavicon
        {...SAMPLE_AVATARFAVICON_PROPS}
        imageSource={SAMPLE_AVATARFAVICON_IMAGESOURCE_LOCAL}
      />,
    );

    const imageComponent = screen.getByTestId(AVATARFAVICON_IMAGE_TESTID);

    expect(imageComponent).toBeTruthy();
  });

  it('should render SVG', () => {
    const wrapper = render(
      <AvatarFavicon
        {...SAMPLE_AVATARFAVICON_PROPS}
        imageSource={SAMPLE_AVATARFAVICON_SVGIMAGESOURCE_REMOTE}
      />,
    );

    expect(wrapper).toMatchSnapshot();
  });

  it('should render fallback', () => {
    render(<AvatarFavicon {...SAMPLE_AVATARFAVICON_PROPS} />);

    const prevImageComponent = screen.getByTestId(AVATARFAVICON_IMAGE_TESTID);

    // Simulate onError on Image component
    fireEvent(prevImageComponent, 'onError', {
      nativeEvent: { error: 'ERROR!' },
    });

    const currentImageComponent = screen.queryByTestId(
      AVATARFAVICON_IMAGE_TESTID,
    );

    expect(currentImageComponent).toBeNull();
  });

  it('should render fallback when svg has error', () => {
    const wrapper = render(
      <AvatarFavicon
        {...SAMPLE_AVATARFAVICON_PROPS}
        imageSource={SAMPLE_AVATARFAVICON_SVGIMAGESOURCE_REMOTE}
      />,
    );
    const prevImageComponent = screen.getByTestId(AVATARFAVICON_IMAGE_TESTID);

    // Simulate onError on Image component
    fireEvent(prevImageComponent, 'onError', {
      nativeEvent: { error: 'ERROR!' },
    });

    const currentImageComponent = screen.queryByTestId(
      AVATARFAVICON_IMAGE_TESTID,
    );

    expect(currentImageComponent).toBeNull();
    expect(wrapper).toMatchSnapshot();
  });
});
