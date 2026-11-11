import React from 'react';
import { AccessibilityInfo } from 'react-native';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import { strings } from '../../../../../../../locales/i18n';
import { PredictHomeTestIds } from '../PredictHome.testIds';
import { HomeGamesError } from './HomeGamesError';

describe('HomeGamesError', () => {
  let announce: jest.SpyInstance;

  beforeEach(() => {
    announce = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    announce.mockRestore();
  });

  it('shows the Games failure message and a Retry', () => {
    render(<HomeGamesError onRetry={jest.fn()} />);

    const error = screen.getByTestId(PredictHomeTestIds.HOME_GAMES_ERROR);
    expect(
      within(error).getByText(strings('predict_next.home_feed.games_error')),
    ).toBeOnTheScreen();
    expect(
      within(error).getByTestId(PredictHomeTestIds.HOME_GAMES_RETRY),
    ).toHaveTextContent(strings('predict_next.home_feed.retry'));
  });

  it('retries once per press', () => {
    const onRetry = jest.fn();
    render(<HomeGamesError onRetry={onRetry} />);

    fireEvent.press(screen.getByTestId(PredictHomeTestIds.HOME_GAMES_RETRY));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('announces the message to screen readers once when it appears', () => {
    const message = strings('predict_next.home_feed.games_error');
    const { rerender } = render(<HomeGamesError onRetry={jest.fn()} />);

    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith(message);

    rerender(<HomeGamesError onRetry={jest.fn()} />);

    expect(announce).toHaveBeenCalledTimes(1);
  });

  it('marks the message as a polite alert', () => {
    render(<HomeGamesError onRetry={jest.fn()} />);

    const message = screen.getByText(
      strings('predict_next.home_feed.games_error'),
    );
    expect(message).toHaveProp('accessibilityRole', 'alert');
    expect(message).toHaveProp('accessibilityLiveRegion', 'polite');
  });
});
