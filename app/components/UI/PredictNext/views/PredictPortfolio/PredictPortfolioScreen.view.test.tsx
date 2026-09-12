import '../../../../../../tests/component-view/mocks';
import { renderPredictPortfolioScreen } from '../../../../../../tests/component-view/renderers/predictNext';
import { fireEvent, waitFor, within, act } from '@testing-library/react-native';
import { focusManager, onlineManager } from '@tanstack/react-query';
import {
  configurePredictNextFeeds,
  messengerCall,
} from '../../../../../../tests/component-view/fixtures/predictNext';
import { KALSHI_VENUE_ID } from '../../types';
import { PredictHomeTestIds } from '../PredictHome/PredictHome.testIds';
import { PredictPortfolioScreenTestIds } from './PredictPortfolioScreen.testIds';

describe('PredictPortfolioScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configurePredictNextFeeds();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    onlineManager.setOnline(true);
  });

  it('loads and rounds the available Balance', async () => {
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });

    expect(
      await view.findByTestId(PredictPortfolioScreenTestIds.BALANCE_VALUE),
    ).toHaveTextContent('$123.13');

    expect(messengerCall).toHaveBeenCalledWith(
      'PredictPortfolioService:getBalance',
      KALSHI_VENUE_ID,
    );
  });

  it('masks the available Balance in privacy mode', async () => {
    const view = renderPredictPortfolioScreen(
      { venueId: KALSHI_VENUE_ID },
      true,
    );

    await view.findByTestId(PredictPortfolioScreenTestIds.BALANCE_VALUE);

    expect(view.queryByText('$123.13')).not.toBeOnTheScreen();
  });

  it('retries a failed Balance read', async () => {
    let fails = true;
    messengerCall.mockImplementation((action: string) =>
      action === 'PredictPortfolioService:getBalance'
        ? fails
          ? Promise.reject(new Error('Balance failed'))
          : Promise.resolve({
              venueId: 'kalshi',
              currency: 'USD',
              available: '5',
            })
        : Promise.resolve(undefined),
    );
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });
    await view.findByTestId(PredictPortfolioScreenTestIds.BALANCE_ERROR);

    fails = false;
    fireEvent.press(
      view.getByTestId(PredictPortfolioScreenTestIds.BALANCE_RETRY),
    );

    expect(
      await view.findByTestId(PredictPortfolioScreenTestIds.BALANCE_VALUE),
    ).toHaveTextContent('$5.00');
  });

  it('keeps the cached Balance visible when a later refetch fails', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });
    await view.findByTestId(PredictPortfolioScreenTestIds.BALANCE_VALUE);

    messengerCall.mockClear();
    messengerCall.mockImplementation((action: string) =>
      action === 'PredictPortfolioService:getBalance'
        ? Promise.reject(new Error('Balance refetch failed'))
        : Promise.resolve(undefined),
    );
    now.mockReturnValue(61_001);
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });

    await waitFor(() =>
      expect(messengerCall).toHaveBeenCalledWith(
        'PredictPortfolioService:getBalance',
        KALSHI_VENUE_ID,
      ),
    );
    // Let the failed refetch settle before asserting the cached amount
    // survives it.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(
      view.getByTestId(PredictPortfolioScreenTestIds.BALANCE_VALUE),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictPortfolioScreenTestIds.BALANCE_ERROR),
    ).not.toBeOnTheScreen();
  });

  it('keeps loading while the first Balance read is offline', async () => {
    onlineManager.setOnline(false);

    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });

    await waitFor(() =>
      expect(
        view.getByTestId(PredictPortfolioScreenTestIds.BALANCE_LOADING),
      ).toBeOnTheScreen(),
    );
  });

  it('switches between mounted empty-state tabs', async () => {
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });
    await view.findByTestId(PredictPortfolioScreenTestIds.BALANCE_VALUE);

    fireEvent.press(
      view.getByTestId(PredictPortfolioScreenTestIds.HISTORY_TAB),
    );

    expect(
      within(
        view.getByTestId(PredictPortfolioScreenTestIds.HISTORY_CONTENT),
      ).getByText('No positions yet'),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(PredictPortfolioScreenTestIds.POSITIONS_CONTENT, {
        includeHiddenElements: true,
      }),
    ).toHaveProp('pointerEvents', 'none');
  });

  it('opens the History tab from route params', async () => {
    const view = renderPredictPortfolioScreen({
      venueId: KALSHI_VENUE_ID,
      initialTab: 'history',
    });

    await view.findByTestId(PredictPortfolioScreenTestIds.BALANCE_VALUE);

    expect(
      view.getByTestId(PredictPortfolioScreenTestIds.HISTORY_TAB).props
        .accessibilityState,
    ).toEqual({ selected: true });
  });

  it('returns to Home from the empty-state CTA', async () => {
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });
    await view.findByTestId(PredictPortfolioScreenTestIds.BALANCE_VALUE);

    fireEvent.press(
      view.getByTestId(PredictPortfolioScreenTestIds.BROWSE_MARKETS),
    );

    expect(await view.findByTestId(PredictHomeTestIds.HOME)).toBeOnTheScreen();
  });
});
