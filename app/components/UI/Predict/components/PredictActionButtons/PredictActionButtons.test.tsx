import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import PredictActionButtons from './PredictActionButtons';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  PredictMarket,
  PredictOutcome,
  PredictMarketStatus,
  Recurrence,
  PriceUpdate,
} from '../../types';
import { useLiveMarketPrices } from '../../hooks/useLiveMarketPrices';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, string>) => {
    if (key === 'predict.claim_amount_text' && params?.amount) {
      return `Claim $${params.amount}`;
    }
    return key;
  }),
}));

jest.mock('../../hooks/useLiveMarketPrices');
const mockUseLiveMarketPrices = useLiveMarketPrices as jest.MockedFunction<
  typeof useLiveMarketPrices
>;

const createMockGetPrice = (priceMap: Map<string, PriceUpdate>) => (tokenId: string) => priceMap.get(tokenId);

const createMockOutcome = (overrides = {}): PredictOutcome => ({
  id: 'outcome-1',
  providerId: 'polymarket',
  marketId: 'market-1',
  title: 'Will it happen?',
  description: 'Test outcome',
  image: 'https://example.com/image.png',
  status: 'open',
  tokens: [
    { id: 'token-yes', title: 'Yes', price: 0.65 },
    { id: 'token-no', title: 'No', price: 0.35 },
  ],
  volume: 1000000,
  groupItemTitle: 'Test Group',
  ...overrides,
});

const createMockMarket = (overrides = {}): PredictMarket => ({
  id: 'market-1',
  providerId: 'polymarket',
  slug: 'test-market',
  title: 'Test Market',
  description: 'Test market description',
  image: 'https://example.com/market.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'sports',
  tags: ['test'],
  outcomes: [createMockOutcome()],
  liquidity: 500000,
  volume: 1000000,
  ...overrides,
});

const createMockGameMarket = (): PredictMarket =>
  createMockMarket({
    game: {
      id: 'game-1',
      startTime: '2024-12-15T13:00:00Z',
      status: 'ongoing',
      league: 'nfl',
      elapsed: '10:30',
      period: 'Q2',
      score: { away: 14, home: 7, raw: '14-7' },
      awayTeam: {
        id: 'sea',
        name: 'Seattle Seahawks',
        logo: 'https://example.com/sea.png',
        abbreviation: 'SEA',
        color: '#002244',
        alias: 'Seahawks',
      },
      homeTeam: {
        id: 'den',
        name: 'Denver Broncos',
        logo: 'https://example.com/den.png',
        abbreviation: 'DEN',
        color: '#FB4F14',
        alias: 'Broncos',
      },
    },
  });

const createDefaultProps = (overrides = {}) => ({
  market: createMockMarket(),
  outcome: createMockOutcome(),
  onBetPress: jest.fn(),
  testID: 'action-buttons',
  ...overrides,
});

describe('PredictActionButtons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLiveMarketPrices.mockReturnValue({
      prices: new Map(),
      getPrice: () => undefined,
      isConnected: false,
      lastUpdateTime: null,
    });
  });

  describe('loading state', () => {
    it('renders skeleton when loading', () => {
      const props = createDefaultProps({ isLoading: true });

      renderWithProvider(<PredictActionButtons {...props} />);

      expect(
        screen.getByTestId('action-buttons-skeleton-button-1'),
      ).toBeOnTheScreen();
    });

    it('does not render buttons when loading', () => {
      const props = createDefaultProps({ isLoading: true });

      renderWithProvider(<PredictActionButtons {...props} />);

      expect(screen.queryByText('YES · 65¢')).not.toBeOnTheScreen();
    });
  });

  describe('claim button', () => {
    it('renders claim button when claimable amount is positive', () => {
      const mockOnClaimPress = jest.fn();
      const props = createDefaultProps({
        claimableAmount: 50.25,
        onClaimPress: mockOnClaimPress,
      });

      renderWithProvider(<PredictActionButtons {...props} />);

      expect(screen.getByText('Claim $50.25')).toBeOnTheScreen();
    });

    it('calls onClaimPress when claim button is pressed', () => {
      const mockOnClaimPress = jest.fn();
      const props = createDefaultProps({
        claimableAmount: 50.25,
        onClaimPress: mockOnClaimPress,
      });

      renderWithProvider(<PredictActionButtons {...props} />);
      fireEvent.press(screen.getByTestId('action-buttons-claim'));

      expect(mockOnClaimPress).toHaveBeenCalledTimes(1);
    });

    it('does not render claim button when claimable amount is zero', () => {
      const props = createDefaultProps({
        claimableAmount: 0,
        onClaimPress: jest.fn(),
      });

      renderWithProvider(<PredictActionButtons {...props} />);

      expect(screen.queryByText(/Claim/)).not.toBeOnTheScreen();
    });

    it('does not render claim button when onClaimPress is not provided', () => {
      const props = createDefaultProps({
        claimableAmount: 50.25,
      });

      renderWithProvider(<PredictActionButtons {...props} />);

      expect(screen.queryByText(/Claim/)).not.toBeOnTheScreen();
    });
  });

  describe('bet buttons for standard markets', () => {
    it('renders yes and no buttons for open market', () => {
      const props = createDefaultProps();

      renderWithProvider(<PredictActionButtons {...props} />);

      expect(screen.getByText('YES · 65¢')).toBeOnTheScreen();
      expect(screen.getByText('NO · 35¢')).toBeOnTheScreen();
    });

    it('calls onBetPress with yes token when yes button is pressed', () => {
      const mockOnBetPress = jest.fn();
      const outcome = createMockOutcome();
      const props = createDefaultProps({ onBetPress: mockOnBetPress, outcome });

      renderWithProvider(<PredictActionButtons {...props} />);
      fireEvent.press(screen.getByTestId('action-buttons-bet-yes'));

      expect(mockOnBetPress).toHaveBeenCalledWith(outcome.tokens[0]);
    });

    it('calls onBetPress with no token when no button is pressed', () => {
      const mockOnBetPress = jest.fn();
      const outcome = createMockOutcome();
      const props = createDefaultProps({ onBetPress: mockOnBetPress, outcome });

      renderWithProvider(<PredictActionButtons {...props} />);
      fireEvent.press(screen.getByTestId('action-buttons-bet-no'));

      expect(mockOnBetPress).toHaveBeenCalledWith(outcome.tokens[1]);
    });

    it('renders nothing for closed market', () => {
      const props = createDefaultProps({
        market: createMockMarket({ status: PredictMarketStatus.CLOSED }),
      });

      renderWithProvider(<PredictActionButtons {...props} />);

      expect(screen.queryByText('YES · 65¢')).not.toBeOnTheScreen();
      expect(screen.queryByText('NO · 35¢')).not.toBeOnTheScreen();
    });
  });

  describe('bet buttons for game markets', () => {
    it('renders team abbreviations as labels', () => {
      const props = createDefaultProps({
        market: createMockGameMarket(),
      });

      renderWithProvider(<PredictActionButtons {...props} />);

      expect(screen.getByText('SEA · 65¢')).toBeOnTheScreen();
      expect(screen.getByText('DEN · 35¢')).toBeOnTheScreen();
    });

    it('calls onBetPress with correct token for away team', () => {
      const mockOnBetPress = jest.fn();
      const outcome = createMockOutcome();
      const props = createDefaultProps({
        market: createMockGameMarket(),
        outcome,
        onBetPress: mockOnBetPress,
      });

      renderWithProvider(<PredictActionButtons {...props} />);
      fireEvent.press(screen.getByTestId('action-buttons-bet-yes'));

      expect(mockOnBetPress).toHaveBeenCalledWith(outcome.tokens[0]);
    });

    it('calls onBetPress with correct token for home team', () => {
      const mockOnBetPress = jest.fn();
      const outcome = createMockOutcome();
      const props = createDefaultProps({
        market: createMockGameMarket(),
        outcome,
        onBetPress: mockOnBetPress,
      });

      renderWithProvider(<PredictActionButtons {...props} />);
      fireEvent.press(screen.getByTestId('action-buttons-bet-no'));

      expect(mockOnBetPress).toHaveBeenCalledWith(outcome.tokens[1]);
    });
  });

  describe('priority order', () => {
    it('shows loading skeleton over claim button', () => {
      const props = createDefaultProps({
        isLoading: true,
        claimableAmount: 50.25,
        onClaimPress: jest.fn(),
      });

      renderWithProvider(<PredictActionButtons {...props} />);

      expect(
        screen.getByTestId('action-buttons-skeleton-button-1'),
      ).toBeOnTheScreen();
      expect(screen.queryByText(/Claim/)).not.toBeOnTheScreen();
    });

    it('shows claim button over bet buttons', () => {
      const props = createDefaultProps({
        claimableAmount: 50.25,
        onClaimPress: jest.fn(),
      });

      renderWithProvider(<PredictActionButtons {...props} />);

      expect(screen.getByText('Claim $50.25')).toBeOnTheScreen();
      expect(screen.queryByText('YES · 65¢')).not.toBeOnTheScreen();
    });
  });

  describe('edge cases', () => {
    it('renders nothing when outcome has less than 2 tokens', () => {
      const outcomeWithOneToken = createMockOutcome({
        tokens: [{ id: 'token-1', title: 'Yes', price: 0.65 }],
      });
      const props = createDefaultProps({ outcome: outcomeWithOneToken });

      renderWithProvider(<PredictActionButtons {...props} />);

      expect(
        screen.queryByTestId('action-buttons-bet-yes'),
      ).not.toBeOnTheScreen();
    });

    it('rounds prices to whole numbers', () => {
      const outcomeWithDecimalPrices = createMockOutcome({
        tokens: [
          { id: 'token-yes', title: 'Yes', price: 0.654 },
          { id: 'token-no', title: 'No', price: 0.346 },
        ],
      });
      const props = createDefaultProps({ outcome: outcomeWithDecimalPrices });

      renderWithProvider(<PredictActionButtons {...props} />);

      expect(screen.getByText('YES · 65¢')).toBeOnTheScreen();
      expect(screen.getByText('NO · 35¢')).toBeOnTheScreen();
    });
  });

  describe('live price updates', () => {
    it('displays live prices when available', () => {
      const priceMap = new Map<string, PriceUpdate>([
        [
          'token-yes',
          { tokenId: 'token-yes', price: 0.72, bestBid: 0.71, bestAsk: 0.73 },
        ],
        [
          'token-no',
          { tokenId: 'token-no', price: 0.28, bestBid: 0.27, bestAsk: 0.29 },
        ],
      ]);
      mockUseLiveMarketPrices.mockReturnValue({
        prices: priceMap,
        getPrice: createMockGetPrice(priceMap),
        isConnected: true,
        lastUpdateTime: Date.now(),
      });
      const props = createDefaultProps();

      renderWithProvider(<PredictActionButtons {...props} />);

      expect(screen.getByText('YES · 72¢')).toBeOnTheScreen();
      expect(screen.getByText('NO · 28¢')).toBeOnTheScreen();
    });

    it('falls back to static prices when live prices unavailable', () => {
      mockUseLiveMarketPrices.mockReturnValue({
        prices: new Map(),
        getPrice: () => undefined,
        isConnected: false,
        lastUpdateTime: null,
      });
      const props = createDefaultProps();

      renderWithProvider(<PredictActionButtons {...props} />);

      expect(screen.getByText('YES · 65¢')).toBeOnTheScreen();
      expect(screen.getByText('NO · 35¢')).toBeOnTheScreen();
    });

    it('uses partial live prices with fallback for missing tokens', () => {
      const priceMap = new Map<string, PriceUpdate>([
        [
          'token-yes',
          { tokenId: 'token-yes', price: 0.8, bestBid: 0.79, bestAsk: 0.81 },
        ],
      ]);
      mockUseLiveMarketPrices.mockReturnValue({
        prices: priceMap,
        getPrice: createMockGetPrice(priceMap),
        isConnected: true,
        lastUpdateTime: Date.now(),
      });
      const props = createDefaultProps();

      renderWithProvider(<PredictActionButtons {...props} />);

      expect(screen.getByText('YES · 80¢')).toBeOnTheScreen();
      expect(screen.getByText('NO · 35¢')).toBeOnTheScreen();
    });

    it('subscribes with correct token IDs', () => {
      const props = createDefaultProps();

      renderWithProvider(<PredictActionButtons {...props} />);

      expect(mockUseLiveMarketPrices).toHaveBeenCalledWith(
        ['token-yes', 'token-no'],
        { enabled: true },
      );
    });

    it('disables subscription when market is closed', () => {
      const props = createDefaultProps({
        market: createMockMarket({ status: PredictMarketStatus.CLOSED }),
      });

      renderWithProvider(<PredictActionButtons {...props} />);

      expect(mockUseLiveMarketPrices).toHaveBeenCalledWith(
        ['token-yes', 'token-no'],
        { enabled: false },
      );
    });

    it('disables subscription when loading', () => {
      const props = createDefaultProps({ isLoading: true });

      renderWithProvider(<PredictActionButtons {...props} />);

      expect(mockUseLiveMarketPrices).toHaveBeenCalledWith(
        ['token-yes', 'token-no'],
        { enabled: false },
      );
    });

    it('displays live prices for game markets', () => {
      const priceMap = new Map<string, PriceUpdate>([
        [
          'token-yes',
          { tokenId: 'token-yes', price: 0.55, bestBid: 0.54, bestAsk: 0.56 },
        ],
        [
          'token-no',
          { tokenId: 'token-no', price: 0.45, bestBid: 0.44, bestAsk: 0.46 },
        ],
      ]);
      mockUseLiveMarketPrices.mockReturnValue({
        prices: priceMap,
        getPrice: createMockGetPrice(priceMap),
        isConnected: true,
        lastUpdateTime: Date.now(),
      });
      const props = createDefaultProps({
        market: createMockGameMarket(),
      });

      renderWithProvider(<PredictActionButtons {...props} />);

      expect(screen.getByText('SEA · 55¢')).toBeOnTheScreen();
      expect(screen.getByText('DEN · 45¢')).toBeOnTheScreen();
    });
  });
});
