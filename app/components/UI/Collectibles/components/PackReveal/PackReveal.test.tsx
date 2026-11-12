import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { Box } from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PackReveal from './PackReveal';
import { PackRevealSelectorsIDs as IDs } from './PackReveal.testIds';

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
  name: 'Provider card',
  image: 'https://cards.test/front.jpg',
  backImage: 'https://cards.test/back.jpg',
};

describe('PackReveal isolated presentation', () => {
  it('waits for the original web reveal before exposing actions', () => {
    const complete = jest.fn();
    renderWithProvider(
      <PackReveal {...CARD} onRevealed={complete}>
        <Box testID="result-actions" />
      </PackReveal>,
    );
    expect(screen.queryByTestId('result-actions')).not.toBeOnTheScreen();

    fireEvent(screen.getByTestId('collectibles-reveal-web'), 'message', {
      nativeEvent: { data: JSON.stringify({ type: 'revealed' }) },
    });

    expect(screen.getByTestId('result-actions')).toBeOnTheScreen();
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('allows skipping one presentation without executing a second completion', () => {
    const complete = jest.fn();
    renderWithProvider(
      <PackReveal {...CARD} onRevealed={complete}>
        <Box testID="result-actions" />
      </PackReveal>,
    );
    const skip = screen.getByTestId(IDs.REVEAL_BUTTON);

    fireEvent.press(skip);
    fireEvent.press(skip);

    expect(complete).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('result-actions')).toBeOnTheScreen();
  });

  it('shows the persisted result without mounting another reveal', () => {
    const complete = jest.fn();
    renderWithProvider(
      <PackReveal {...CARD} initiallyRevealed onRevealed={complete}>
        <Box testID="result-actions" />
      </PackReveal>,
    );

    expect(
      screen.queryByTestId('collectibles-reveal-web'),
    ).not.toBeOnTheScreen();
    expect(screen.getByTestId('result-actions')).toBeOnTheScreen();
    expect(complete).not.toHaveBeenCalled();
  });

  it('ignores non-presentation messages from content', () => {
    const complete = jest.fn();
    renderWithProvider(<PackReveal {...CARD} onRevealed={complete} />);

    fireEvent(screen.getByTestId('collectibles-reveal-web'), 'message', {
      nativeEvent: { data: JSON.stringify({ type: 'buy', quantity: 5 }) },
    });

    expect(complete).not.toHaveBeenCalled();
    expect(screen.getByTestId(IDs.REVEAL_BUTTON)).toBeOnTheScreen();
  });
});
