import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  PredictOutcome,
  Recurrence,
  PredictMarket as PredictMarketType,
} from '../../types';
import { PredictEventValues } from '../../constants/eventNames';
import PredictMarketRowItem from './';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

const createMockOutcome = (overrides = {}): PredictOutcome => ({
  id: 'test-outcome-1',
  providerId: 'polymarket',
  marketId: 'test-market-1',
  title: 'Monad market cap (FDV) >$4B one day after launch?',
  description: 'Test outcome description',
  image: 'https://example.com/monad.jpg',
  status: 'open',
  tokens: [
    {
      id: 'token-yes',
      title: 'Yes',
      price: 0.49,
    },
    {
      id: 'token-no',
      title: 'No',
      price: 0.51,
    },
  ],
  volume: 27917977,
  groupItemTitle: '>$4B',
  negRisk: false,
  tickSize: '0.001',
  ...overrides,
});

const createMockMarket = (overrides = {}): PredictMarketType => ({
  id: 'test-market-1',
  providerId: 'polymarket',
  slug: 'monad-fdv-prediction',
  title: 'Monad FDV one day after launch?',
  description: 'Prediction market for Monad FDV',
  image: 'https://example.com/monad.jpg',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'crypto',
  tags: ['crypto', 'trending'],
  outcomes: [createMockOutcome()],
  liquidity: 1000000,
  volume: 27917977,
  ...overrides,
});

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PredictMarketRowItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('renders market information with correct title and subtitle', () => {
    const market = createMockMarket();

    const { getByText } = renderWithProvider(
      <PredictMarketRowItem market={market} />,
      { state: initialState },
    );

    expect(getByText('Monad FDV one day after launch?')).toBeOnTheScreen();
    expect(getByText('49% chance on >$4B')).toBeOnTheScreen();
  });

  it('navigates to market details when pressed', () => {
    const market = createMockMarket();

    const { getByText } = renderWithProvider(
      <PredictMarketRowItem market={market} />,
      { state: initialState },
    );

    const touchable = getByText('Monad FDV one day after launch?');
    fireEvent.press(touchable);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_DETAILS,
      params: {
        marketId: 'test-market-1',
        entryPoint: PredictEventValues.ENTRY_POINT.TRENDING_SEARCH,
        title: 'Monad FDV one day after launch?',
        image: 'https://example.com/monad.jpg',
      },
    });
  });

  it('displays outcome with highest probability', () => {
    const highProbabilityOutcome = createMockOutcome({
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0.93 },
        { id: 'token-no', title: 'No', price: 0.07 },
      ],
      groupItemTitle: 'Clair Obscur: Expedition 33',
    });
    const market = createMockMarket({
      outcomes: [highProbabilityOutcome],
    });

    const { getByText } = renderWithProvider(
      <PredictMarketRowItem market={market} />,
      { state: initialState },
    );

    expect(
      getByText('93% chance on Clair Obscur: Expedition 33'),
    ).toBeOnTheScreen();
  });

  it('filters out closed outcomes', () => {
    const closedOutcome = createMockOutcome({
      status: 'closed',
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0 },
        { id: 'token-no', title: 'No', price: 1 },
      ],
      groupItemTitle: 'Closed Option',
    });
    const openOutcome = createMockOutcome({
      status: 'open',
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0.75 },
        { id: 'token-no', title: 'No', price: 0.25 },
      ],
      groupItemTitle: 'Active Option',
    });
    const market = createMockMarket({
      outcomes: [closedOutcome, openOutcome],
    });

    const { getByText, queryByText } = renderWithProvider(
      <PredictMarketRowItem market={market} />,
      { state: initialState },
    );

    expect(getByText('75% chance on Active Option')).toBeOnTheScreen();
    expect(queryByText('Closed Option')).not.toBeOnTheScreen();
  });

  it('filters out resolved outcomes', () => {
    const resolvedOutcome = createMockOutcome({
      status: 'resolved',
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 1 },
        { id: 'token-no', title: 'No', price: 0 },
      ],
      groupItemTitle: 'Resolved Option',
    });
    const openOutcome = createMockOutcome({
      status: 'open',
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0.6 },
        { id: 'token-no', title: 'No', price: 0.4 },
      ],
      groupItemTitle: 'Open Option',
    });
    const market = createMockMarket({
      outcomes: [resolvedOutcome, openOutcome],
    });

    const { getByText, queryByText } = renderWithProvider(
      <PredictMarketRowItem market={market} />,
      { state: initialState },
    );

    expect(getByText('60% chance on Open Option')).toBeOnTheScreen();
    expect(queryByText('Resolved Option')).not.toBeOnTheScreen();
  });

  it('returns null when all outcomes are closed or resolved', () => {
    const closedOutcome = createMockOutcome({
      status: 'closed',
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0 },
        { id: 'token-no', title: 'No', price: 1 },
      ],
    });
    const resolvedOutcome = createMockOutcome({
      id: 'test-outcome-2',
      status: 'resolved',
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 1 },
        { id: 'token-no', title: 'No', price: 0 },
      ],
    });
    const market = createMockMarket({
      outcomes: [closedOutcome, resolvedOutcome],
    });

    const { queryByText } = renderWithProvider(
      <PredictMarketRowItem market={market} />,
      { state: initialState },
    );

    expect(
      queryByText('Monad FDV one day after launch?'),
    ).not.toBeOnTheScreen();
  });

  it('returns null when outcomes array is empty', () => {
    const market = createMockMarket({
      outcomes: [],
    });

    const { queryByText } = renderWithProvider(
      <PredictMarketRowItem market={market} />,
      { state: initialState },
    );

    expect(
      queryByText('Monad FDV one day after launch?'),
    ).not.toBeOnTheScreen();
  });

  it('uses groupItemTitle when available', () => {
    const outcome = createMockOutcome({
      title: 'Will Apple be the second-largest company?',
      groupItemTitle: 'Apple',
    });
    const market = createMockMarket({
      outcomes: [outcome],
    });

    const { getByText } = renderWithProvider(
      <PredictMarketRowItem market={market} />,
      { state: initialState },
    );

    expect(getByText('49% chance on Apple')).toBeOnTheScreen();
  });

  it('falls back to title when groupItemTitle is missing', () => {
    const outcome = createMockOutcome({
      title: 'Full Market Question?',
      groupItemTitle: undefined as unknown as string,
    });
    const market = createMockMarket({
      outcomes: [outcome],
    });

    const { getByText } = renderWithProvider(
      <PredictMarketRowItem market={market} />,
      { state: initialState },
    );

    expect(getByText('49% chance on Full Market Question?')).toBeOnTheScreen();
  });

  it('displays <1% for very low probabilities', () => {
    const lowProbabilityOutcome = createMockOutcome({
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0.005 },
        { id: 'token-no', title: 'No', price: 0.995 },
      ],
      groupItemTitle: '>$4B',
    });
    const market = createMockMarket({
      outcomes: [lowProbabilityOutcome],
    });

    const { getByText } = renderWithProvider(
      <PredictMarketRowItem market={market} />,
      { state: initialState },
    );

    expect(getByText('<1% chance on >$4B')).toBeOnTheScreen();
  });

  it('displays >99% for very high probabilities', () => {
    const highProbabilityOutcome = createMockOutcome({
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0.995 },
        { id: 'token-no', title: 'No', price: 0.005 },
      ],
      groupItemTitle: 'Apple',
    });
    const market = createMockMarket({
      outcomes: [highProbabilityOutcome],
    });

    const { getByText } = renderWithProvider(
      <PredictMarketRowItem market={market} />,
      { state: initialState },
    );

    expect(getByText('>99% chance on Apple')).toBeOnTheScreen();
  });

  it('displays rounded percentage for regular probabilities', () => {
    const outcome = createMockOutcome({
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0.6547 },
        { id: 'token-no', title: 'No', price: 0.3453 },
      ],
    });
    const market = createMockMarket({
      outcomes: [outcome],
    });

    const { getByText } = renderWithProvider(
      <PredictMarketRowItem market={market} />,
      { state: initialState },
    );

    expect(getByText('65% chance on >$4B')).toBeOnTheScreen();
  });

  it('renders without image when image is missing', () => {
    const market = createMockMarket({
      image: '',
    });

    const { getByText } = renderWithProvider(
      <PredictMarketRowItem market={market} />,
      { state: initialState },
    );

    expect(getByText('Monad FDV one day after launch?')).toBeOnTheScreen();
  });

  it('truncates long market title with ellipsis', () => {
    const market = createMockMarket({
      title:
        'Will this extremely long market title that exceeds the maximum width be properly truncated with an ellipsis?',
    });

    const { getByText } = renderWithProvider(
      <PredictMarketRowItem market={market} />,
      { state: initialState },
    );

    const titleElement = getByText(
      'Will this extremely long market title that exceeds the maximum width be properly truncated with an ellipsis?',
    );

    expect(titleElement).toBeOnTheScreen();
    expect(titleElement.props.numberOfLines).toBe(1);
    expect(titleElement.props.ellipsizeMode).toBe('tail');
  });

  it('truncates long outcome title with ellipsis', () => {
    const outcome = createMockOutcome({
      groupItemTitle:
        'This is an extremely long outcome title that should be truncated',
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0.75 },
        { id: 'token-no', title: 'No', price: 0.25 },
      ],
    });
    const market = createMockMarket({
      outcomes: [outcome],
    });

    const { getByText } = renderWithProvider(
      <PredictMarketRowItem market={market} />,
      { state: initialState },
    );

    const subtitleElement = getByText(
      '75% chance on This is an extremely long outcome title that should be truncated',
    );

    expect(subtitleElement).toBeOnTheScreen();
    expect(subtitleElement.props.numberOfLines).toBe(1);
    expect(subtitleElement.props.ellipsizeMode).toBe('tail');
  });

  it('uses custom testID when provided', () => {
    const market = createMockMarket();

    const { getByTestId } = renderWithProvider(
      <PredictMarketRowItem market={market} testID="custom-test-id" />,
      { state: initialState },
    );

    expect(getByTestId('custom-test-id')).toBeOnTheScreen();
  });

  it('uses default testID when not provided', () => {
    const market = createMockMarket();

    const { getByTestId } = renderWithProvider(
      <PredictMarketRowItem market={market} />,
      { state: initialState },
    );

    expect(
      getByTestId('predict-market-row-item-test-market-1'),
    ).toBeOnTheScreen();
  });

  it('passes custom entryPoint to navigation params', () => {
    const market = createMockMarket();
    const customEntryPoint = PredictEventValues.ENTRY_POINT.SEARCH;

    const { getByText } = renderWithProvider(
      <PredictMarketRowItem market={market} entryPoint={customEntryPoint} />,
      { state: initialState },
    );

    const touchable = getByText('Monad FDV one day after launch?');
    fireEvent.press(touchable);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_DETAILS,
      params: {
        marketId: 'test-market-1',
        entryPoint: customEntryPoint,
        title: 'Monad FDV one day after launch?',
        image: 'https://example.com/monad.jpg',
      },
    });
  });

  it('selects first unresolved outcome from sorted list', () => {
    const outcome1 = createMockOutcome({
      id: 'outcome-1',
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0.3 },
        { id: 'token-no', title: 'No', price: 0.7 },
      ],
      groupItemTitle: 'Lower Probability',
    });
    const outcome2 = createMockOutcome({
      id: 'outcome-2',
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0.85 },
        { id: 'token-no', title: 'No', price: 0.15 },
      ],
      groupItemTitle: 'Higher Probability',
    });
    const market = createMockMarket({
      outcomes: [outcome2, outcome1], // API returns outcomes sorted descending by price
    });

    const { getByText } = renderWithProvider(
      <PredictMarketRowItem market={market} />,
      { state: initialState },
    );

    expect(getByText('85% chance on Higher Probability')).toBeOnTheScreen();
  });

  it('returns null when outcome has no tokens', () => {
    const outcomeWithoutTokens = createMockOutcome({
      tokens: [],
    });
    const market = createMockMarket({
      outcomes: [outcomeWithoutTokens],
    });

    const { queryByText } = renderWithProvider(
      <PredictMarketRowItem market={market} />,
      { state: initialState },
    );

    expect(
      queryByText('Monad FDV one day after launch?'),
    ).not.toBeOnTheScreen();
  });

  it('returns null when outcome tokens array is undefined', () => {
    const outcomeWithUndefinedTokens = createMockOutcome({
      tokens: undefined as unknown as typeof createMockOutcome.prototype.tokens,
    });
    const market = createMockMarket({
      outcomes: [outcomeWithUndefinedTokens],
    });

    const { queryByText } = renderWithProvider(
      <PredictMarketRowItem market={market} />,
      { state: initialState },
    );

    expect(
      queryByText('Monad FDV one day after launch?'),
    ).not.toBeOnTheScreen();
  });
});
