import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import SocialFeedGif, { clampGifAspectRatio } from './SocialFeedGif';

const getAspectRatio = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style).aspectRatio;

describe('clampGifAspectRatio', () => {
  it('keeps a landscape ratio', () => {
    expect(clampGifAspectRatio(1600, 900)).toBeCloseTo(16 / 9);
  });

  it('stops tall GIFs at 4:5', () => {
    expect(clampGifAspectRatio(300, 900)).toBe(4 / 5);
  });

  it('falls back to square for a missing size', () => {
    expect(clampGifAspectRatio(0, 0)).toBe(1);
  });
});

describe('SocialFeedGif', () => {
  it('starts square and takes the GIF ratio once it loads', () => {
    render(<SocialFeedGif uri="https://static.klipy.com/a.gif" testID="gif" />);

    expect(getAspectRatio('gif')).toBe(1);

    fireEvent(screen.getByTestId('gif'), 'load', {
      nativeEvent: { source: { width: 400, height: 300 } },
    });

    expect(getAspectRatio('gif')).toBeCloseTo(4 / 3);
  });

  it('reuses a measured ratio on the next mount', () => {
    const uri = 'https://static.klipy.com/b.gif';
    const { unmount } = render(<SocialFeedGif uri={uri} testID="gif" />);
    fireEvent(screen.getByTestId('gif'), 'load', {
      nativeEvent: { source: { width: 1600, height: 900 } },
    });
    unmount();

    render(<SocialFeedGif uri={uri} testID="gif" />);

    expect(getAspectRatio('gif')).toBeCloseTo(16 / 9);
  });
});
