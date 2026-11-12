import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import InteractiveCard from './InteractiveCard';

jest.mock('@metamask/react-native-webview', () => ({
  WebView: jest.requireActual('react-native').View,
}));
jest.mock('../../hooks/useCollectiblesPresentation', () => ({
  useCollectiblesPresentation: () => ({
    online: true,
    network: 'WIFI',
    animate: true,
  }),
}));

const CARD = {
  name: 'Provider scan',
  frontImage: 'https://cards.test/front.jpg',
  backImage: 'https://cards.test/back.jpg',
};

describe('InteractiveCard original Replit scene', () => {
  it('notifies readiness after the actual scene loads the scan', () => {
    const ready = jest.fn();
    renderWithProvider(<InteractiveCard {...CARD} onImageReady={ready} />);
    const view = screen.getByTestId('collectibles-interactive-card-web');
    expect(ready).not.toHaveBeenCalled();

    fireEvent(view, 'message', {
      nativeEvent: { data: JSON.stringify({ type: 'imageReady' }) },
    });
    fireEvent(view, 'message', {
      nativeEvent: { data: JSON.stringify({ type: 'imageReady' }) },
    });

    expect(ready).toHaveBeenCalledTimes(1);
  });

  it('rejects navigation away from the isolated document', () => {
    renderWithProvider(<InteractiveCard {...CARD} />);
    const guard = screen.getByTestId('collectibles-interactive-card-web').props
      .onShouldStartLoadWithRequest;

    expect(guard({ url: 'about:blank' })).toBe(true);
    expect(guard({ url: 'https://cards.test/' })).toBe(false);
    expect(guard({ url: 'metamask://buy' })).toBe(false);
  });

  it('falls back to the supplied scan if the browser process fails', () => {
    const ready = jest.fn();
    renderWithProvider(<InteractiveCard {...CARD} onImageReady={ready} />);

    fireEvent(screen.getByTestId('collectibles-interactive-card-web'), 'error');

    expect(
      screen.queryByTestId('collectibles-interactive-card-web'),
    ).not.toBeOnTheScreen();
    expect(ready).toHaveBeenCalled();
  });
  it('falls back if the bundled scene reports a JavaScript error', () => {
    renderWithProvider(<InteractiveCard {...CARD} />);
    fireEvent(
      screen.getByTestId('collectibles-interactive-card-web'),
      'message',
      { nativeEvent: { data: '{"type":"error"}' } },
    );
    expect(
      screen.queryByTestId('collectibles-interactive-card-web'),
    ).not.toBeOnTheScreen();
  });
});
