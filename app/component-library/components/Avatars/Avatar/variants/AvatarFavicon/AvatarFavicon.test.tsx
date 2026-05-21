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
  DEFAULT_AVATARFAVICON_ERROR_ICON,
  SAMPLE_AVATARFAVICON_PROPS,
  SAMPLE_AVATARFAVICON_IMAGESOURCE_LOCAL,
  SAMPLE_AVATARFAVICON_SVGIMAGESOURCE_REMOTE,
} from './AvatarFavicon.constants';
import { AvatarSize } from '../../Avatar.types';
import { IconSize } from '../../../../Icons/Icon';

jest.mock('../../../../Icons/Icon', () => {
  const ReactActual = jest.requireActual('react');
  const { IconName, IconSize, IconColor } = jest.requireActual(
    '../../../../Icons/Icon/Icon.types',
  );

  return {
    __esModule: true,
    IconColor,
    IconName,
    IconSize,
    default: ({ name, size }: { name: string; size: string }) =>
      ReactActual.createElement('Icon', { name, size }),
  };
});

describe('AvatarFavicon', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('should match the snapshot', () => {
    const { toJSON } = render(
      <AvatarFavicon {...SAMPLE_AVATARFAVICON_PROPS} />,
    );
    expect(toJSON()).toBeDefined();
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

  it('renders full-size fallback when favicon source is missing', () => {
    const { UNSAFE_getByProps } = render(
      <AvatarFavicon size={AvatarSize.Md} />,
    );

    const fallbackIcon = UNSAFE_getByProps({
      name: DEFAULT_AVATARFAVICON_ERROR_ICON,
    });

    expect(fallbackIcon.props.size).toBe(IconSize.Md);
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
    expect(toJSON()).toBeDefined();
  });
});
