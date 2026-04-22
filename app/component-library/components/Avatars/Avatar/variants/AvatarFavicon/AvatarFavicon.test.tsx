// Third party dependencies.
import React from 'react';
import {
  render,
  screen,
  waitFor,
  fireEvent,
} from '@testing-library/react-native';

// Internal dependencies.
import AvatarFavicon from './AvatarFavicon';
import {
  AVATARFAVICON_IMAGE_TESTID,
  AVATARFAVICON_IMAGE_SVG_TESTID,
  SAMPLE_AVATARFAVICON_PROPS,
  SAMPLE_AVATARFAVICON_IMAGESOURCE_LOCAL,
  SAMPLE_AVATARFAVICON_SVGIMAGESOURCE_REMOTE,
} from './AvatarFavicon.constants';

describe('AvatarFavicon', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('should match the snapshot', () => {
    const { toJSON } = render(
      <AvatarFavicon {...SAMPLE_AVATARFAVICON_PROPS} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render favicon with remote image', () => {
    render(<AvatarFavicon {...SAMPLE_AVATARFAVICON_PROPS} />);
    expect(screen.getByTestId(AVATARFAVICON_IMAGE_TESTID)).toBeDefined();
  });

  it('should render favicon with local image', () => {
    render(
      <AvatarFavicon
        {...SAMPLE_AVATARFAVICON_PROPS}
        imageSource={SAMPLE_AVATARFAVICON_IMAGESOURCE_LOCAL}
      />,
    );
    expect(screen.getByTestId(AVATARFAVICON_IMAGE_TESTID)).toBeDefined();
  });

  it('should render SVG', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: new Headers({ 'Content-Type': 'image/svg+xml' }),
      text: () => '<svg />',
    });

    const { getByTestId, toJSON } = render(
      <AvatarFavicon
        {...SAMPLE_AVATARFAVICON_PROPS}
        imageSource={SAMPLE_AVATARFAVICON_SVGIMAGESOURCE_REMOTE}
      />,
    );

    await waitFor(() =>
      expect(getByTestId(AVATARFAVICON_IMAGE_SVG_TESTID)).toBeDefined(),
    );
  });

  it('should render fallback', () => {
    render(<AvatarFavicon {...SAMPLE_AVATARFAVICON_PROPS} />);
    const prevImageComponent = screen.getByTestId(AVATARFAVICON_IMAGE_TESTID);
    // Simulate onError on Image component
    fireEvent(prevImageComponent, 'error', {
      nativeEvent: { error: 'ERROR!' },
    });
    expect(screen.queryByTestId(AVATARFAVICON_IMAGE_TESTID)).toBeNull();
  });

  it('should render fallback when svg has error', () => {
    const { toJSON } = render(
      <AvatarFavicon
        {...SAMPLE_AVATARFAVICON_PROPS}
        imageSource={SAMPLE_AVATARFAVICON_SVGIMAGESOURCE_REMOTE}
      />,
    );
    const prevImageComponent = screen.getByTestId(AVATARFAVICON_IMAGE_TESTID);
    // Simulate onError on Image component
    fireEvent(prevImageComponent, 'error', new Error('ERROR!'));
    expect(screen.getByTestId(AVATARFAVICON_IMAGE_TESTID)).toBeDefined();
    expect(toJSON()).toMatchSnapshot();
  });
});
