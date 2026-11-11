import React from 'react';
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
});
