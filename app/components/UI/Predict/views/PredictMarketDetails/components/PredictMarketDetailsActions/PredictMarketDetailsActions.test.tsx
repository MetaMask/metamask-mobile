import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import {
  PredictMarket,
  PredictMarketStatus,
  PredictOutcome,
  Recurrence,
} from '../../../../types';
import { POLYMARKET_PROVIDER_ID } from '../../../../providers/polymarket/constants';
import { PredictMarketDetailsSelectorsIDs } from '../../../../Predict.testIds';
import PredictMarketDetailsActions from './PredictMarketDetailsActions';

const createOutcome = (overrides = {}): PredictOutcome => ({
  id: 'outcome-1',
  marketId: 'market-1',
  providerId: POLYMARKET_PROVIDER_ID,
  title: 'Outcome',
  description: 'Outcome description',
  image: 'https://example.com/outcome.png',
  status: 'open',
  volume: 1000,
  groupItemTitle: 'Winner',
  tokens: [
    { id: 'token-yes', title: 'Yes', price: 0.65 },
    { id: 'token-no', title: 'No', price: 0.35 },
  ],
  ...overrides,
});

const createMarket = (overrides = {}): PredictMarket => ({
  id: 'market-1',
  providerId: POLYMARKET_PROVIDER_ID,
  slug: 'market-1',
  title: 'Test market',
  description: 'Test market description',
  image: 'https://example.com/market.png',
  status: PredictMarketStatus.OPEN,
  recurrence: Recurrence.NONE,
  category: 'sports',
  tags: [],
  outcomes: [createOutcome()],
  liquidity: 1000,
  volume: 2000,
  ...overrides,
});

const createProps = (
  overrides: Partial<
    React.ComponentProps<typeof PredictMarketDetailsActions>
  > = {},
) => ({
  isClaimablePositionsLoading: false,
  hasPositivePnl: false,
  marketStatus: PredictMarketStatus.OPEN,
  singleOutcomeMarket: true,
  isMarketLoading: false,
  market: createMarket(),
  openOutcomes: [createOutcome()],
  yesPercentage: 65,
  onClaimPress: jest.fn(),
  onBuyPress: jest.fn(),
  isClaimPending: false,
  ...overrides,
});

describe('PredictMarketDetailsActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders claim button when claimable pnl is available', () => {
    const onClaimPress = jest.fn();
    const props = createProps({
      hasPositivePnl: true,
      onClaimPress,
    });

    renderWithProvider(<PredictMarketDetailsActions {...props} />);

    const claimButton = screen.getByTestId(
      PredictMarketDetailsSelectorsIDs.CLAIM_WINNINGS_BUTTON,
    );
    expect(claimButton).toBeOnTheScreen();
  });

  it('renders buy buttons for open single-outcome market and handles presses', () => {
    const onBuyPress = jest.fn();
    const openOutcome = createOutcome();
    const props = createProps({
      hasPositivePnl: false,
      onBuyPress,
      openOutcomes: [openOutcome],
      yesPercentage: 70,
    });

    renderWithProvider(<PredictMarketDetailsActions {...props} />);

    fireEvent.press(screen.getByText('Yes • 70¢'));
    fireEvent.press(screen.getByText('No • 30¢'));

    expect(onBuyPress).toHaveBeenNthCalledWith(1, openOutcome.tokens[0]);
    expect(onBuyPress).toHaveBeenNthCalledWith(2, openOutcome.tokens[1]);
  });

  it('falls back to market tokens when open outcomes are unavailable', () => {
    const onBuyPress = jest.fn();
    const fallbackMarket = createMarket();
    const props = createProps({
      market: fallbackMarket,
      openOutcomes: [],
      onBuyPress,
      yesPercentage: 65,
    });

    renderWithProvider(<PredictMarketDetailsActions {...props} />);

    fireEvent.press(screen.getByText(/•\s*65¢/));
    fireEvent.press(screen.getByText(/•\s*35¢/));

    expect(onBuyPress).toHaveBeenNthCalledWith(
      1,
      fallbackMarket.outcomes[0].tokens[0],
    );
    expect(onBuyPress).toHaveBeenNthCalledWith(
      2,
      fallbackMarket.outcomes[0].tokens[1],
    );
  });

  it('renders skeleton while market details are loading', () => {
    const props = createProps({
      isMarketLoading: true,
      market: null,
      marketStatus: PredictMarketStatus.CLOSED,
      singleOutcomeMarket: false,
    });

    renderWithProvider(<PredictMarketDetailsActions {...props} />);

    expect(
      screen.getByTestId('predict-details-buttons-skeleton-button-1'),
    ).toBeOnTheScreen();
  });

  it('renders nothing when no action state is active', () => {
    const props = createProps({
      marketStatus: PredictMarketStatus.CLOSED,
      singleOutcomeMarket: false,
      hasPositivePnl: false,
      isClaimablePositionsLoading: false,
      isMarketLoading: false,
    });

    renderWithProvider(<PredictMarketDetailsActions {...props} />);

    expect(
      screen.queryByTestId(
        PredictMarketDetailsSelectorsIDs.CLAIM_WINNINGS_BUTTON,
      ),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId('predict-details-buttons-skeleton-button-1'),
    ).not.toBeOnTheScreen();
  });
});
