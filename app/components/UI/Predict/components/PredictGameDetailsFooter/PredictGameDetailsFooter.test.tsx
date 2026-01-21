import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import PredictGameDetailsFooter from './PredictGameDetailsFooter';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  PredictMarket,
  PredictOutcome,
  PredictMarketStatus,
  Recurrence,
} from '../../types';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, string>) => {
    if (
      key === 'predict.game_details_footer.volume_display' &&
      params?.volume
    ) {
      return `$${params.volume} Vol`;
    }
    if (key === 'predict.game_details_footer.pick_a_winner') {
      return 'Pick a winner';
    }
    if (key === 'predict.tabs.about') {
      return 'About';
    }
    if (key === 'predict.game_details_footer.read_terms') {
      return 'Read the full contract terms and conditions';
    }
    if (key === 'predict.claim_amount_text' && params?.amount) {
      return `Claim $${params.amount}`;
    }
    return key;
  }),
}));

jest.mock('../../hooks/useLiveMarketPrices', () => ({
  useLiveMarketPrices: () => ({
    prices: new Map(),
    getPrice: jest.fn(),
    isConnected: false,
    lastUpdateTime: null,
  }),
}));

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
  description: 'This is a test market description for testing purposes.',
  image: 'https://example.com/market.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'sports',
  tags: ['test'],
  outcomes: [createMockOutcome()],
  liquidity: 500000,
  volume: 1500000,
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
  onInfoPress: jest.fn(),
  testID: 'game-details-footer',
  ...overrides,
});

describe('PredictGameDetailsFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('info row', () => {
    it('renders pick a winner label', () => {
      const props = createDefaultProps();

      renderWithProvider(<PredictGameDetailsFooter {...props} />);

      expect(screen.getByText('Pick a winner')).toBeOnTheScreen();
    });

    it('renders info button', () => {
      const props = createDefaultProps();

      renderWithProvider(<PredictGameDetailsFooter {...props} />);

      expect(
        screen.getByTestId('game-details-footer-info-button'),
      ).toBeOnTheScreen();
    });

    it('calls onInfoPress when info button is pressed', () => {
      const mockOnInfoPress = jest.fn();
      const props = createDefaultProps({ onInfoPress: mockOnInfoPress });

      renderWithProvider(<PredictGameDetailsFooter {...props} />);
      fireEvent.press(screen.getByTestId('game-details-footer-info-button'));

      expect(mockOnInfoPress).toHaveBeenCalledTimes(1);
    });

    it('renders formatted volume', () => {
      const props = createDefaultProps({
        market: createMockMarket({ volume: 1500000 }),
      });

      renderWithProvider(<PredictGameDetailsFooter {...props} />);

      expect(screen.getByText('$1.5M Vol')).toBeOnTheScreen();
    });

    it('renders volume in thousands format', () => {
      const props = createDefaultProps({
        market: createMockMarket({ volume: 130490 }),
      });

      renderWithProvider(<PredictGameDetailsFooter {...props} />);

      expect(screen.getByText('$130.49k Vol')).toBeOnTheScreen();
    });

    it('renders volume for small amounts', () => {
      const props = createDefaultProps({
        market: createMockMarket({ volume: 500 }),
      });

      renderWithProvider(<PredictGameDetailsFooter {...props} />);

      expect(screen.getByText('$500 Vol')).toBeOnTheScreen();
    });
  });

  describe('action buttons integration', () => {
    it('renders bet buttons for open market', () => {
      const props = createDefaultProps();

      renderWithProvider(<PredictGameDetailsFooter {...props} />);

      expect(screen.getByText('YES · 65¢')).toBeOnTheScreen();
      expect(screen.getByText('NO · 35¢')).toBeOnTheScreen();
    });

    it('renders team buttons for game market', () => {
      const props = createDefaultProps({
        market: createMockGameMarket(),
      });

      renderWithProvider(<PredictGameDetailsFooter {...props} />);

      expect(screen.getByText('SEA · 65¢')).toBeOnTheScreen();
      expect(screen.getByText('DEN · 35¢')).toBeOnTheScreen();
    });

    it('calls onBetPress when bet button is pressed', () => {
      const mockOnBetPress = jest.fn();
      const outcome = createMockOutcome();
      const props = createDefaultProps({
        onBetPress: mockOnBetPress,
        outcome,
      });

      renderWithProvider(<PredictGameDetailsFooter {...props} />);
      fireEvent.press(
        screen.getByTestId('game-details-footer-action-buttons-bet-yes'),
      );

      expect(mockOnBetPress).toHaveBeenCalledWith(outcome.tokens[0]);
    });

    it('renders claim button when claimable amount is positive', () => {
      const mockOnClaimPress = jest.fn();
      const props = createDefaultProps({
        claimableAmount: 75.5,
        onClaimPress: mockOnClaimPress,
      });

      renderWithProvider(<PredictGameDetailsFooter {...props} />);

      expect(screen.getByText('Claim $75.50')).toBeOnTheScreen();
    });

    it('calls onClaimPress when claim button is pressed', () => {
      const mockOnClaimPress = jest.fn();
      const props = createDefaultProps({
        claimableAmount: 75.5,
        onClaimPress: mockOnClaimPress,
      });

      renderWithProvider(<PredictGameDetailsFooter {...props} />);
      fireEvent.press(
        screen.getByTestId('game-details-footer-action-buttons-claim'),
      );

      expect(mockOnClaimPress).toHaveBeenCalledTimes(1);
    });

    it('renders skeleton when loading', () => {
      const props = createDefaultProps({ isLoading: true });

      renderWithProvider(<PredictGameDetailsFooter {...props} />);

      expect(
        screen.getByTestId(
          'game-details-footer-action-buttons-skeleton-button-1',
        ),
      ).toBeOnTheScreen();
    });

    it('hides info row when claim button is displayed', () => {
      const props = createDefaultProps({
        claimableAmount: 50,
        onClaimPress: jest.fn(),
      });

      renderWithProvider(<PredictGameDetailsFooter {...props} />);

      expect(screen.queryByText('Pick a winner')).toBeNull();
      expect(
        screen.queryByTestId('game-details-footer-info-button'),
      ).toBeNull();
      expect(screen.queryByTestId('game-details-footer-volume')).toBeNull();
    });

    it('shows info row when claimableAmount is zero', () => {
      const props = createDefaultProps({
        claimableAmount: 0,
        onClaimPress: jest.fn(),
      });

      renderWithProvider(<PredictGameDetailsFooter {...props} />);

      expect(screen.getByText('Pick a winner')).toBeOnTheScreen();
      expect(
        screen.getByTestId('game-details-footer-info-button'),
      ).toBeOnTheScreen();
    });

    it('shows info row when onClaimPress is undefined', () => {
      const props = createDefaultProps({
        claimableAmount: 50,
        onClaimPress: undefined,
      });

      renderWithProvider(<PredictGameDetailsFooter {...props} />);

      expect(screen.getByText('Pick a winner')).toBeOnTheScreen();
      expect(
        screen.getByTestId('game-details-footer-info-button'),
      ).toBeOnTheScreen();
    });

    it('renders claim button for closed market with positive claimable amount', () => {
      const props = createDefaultProps({
        market: createMockMarket({ status: PredictMarketStatus.CLOSED }),
        claimableAmount: 100,
        onClaimPress: jest.fn(),
      });

      renderWithProvider(<PredictGameDetailsFooter {...props} />);

      expect(screen.getByTestId('game-details-footer')).toBeOnTheScreen();
      expect(screen.getByText('Claim $100.00')).toBeOnTheScreen();
    });
  });

  describe('footer visibility', () => {
    it('returns null for closed market without claimable winnings', () => {
      const props = createDefaultProps({
        market: createMockMarket({ status: PredictMarketStatus.CLOSED }),
      });

      renderWithProvider(<PredictGameDetailsFooter {...props} />);

      expect(screen.queryByTestId('game-details-footer')).toBeNull();
    });

    it('returns null for resolved market without claimable winnings', () => {
      const props = createDefaultProps({
        market: createMockMarket({ status: PredictMarketStatus.RESOLVED }),
      });

      renderWithProvider(<PredictGameDetailsFooter {...props} />);

      expect(screen.queryByTestId('game-details-footer')).toBeNull();
    });

    it('renders footer for open market', () => {
      const props = createDefaultProps({
        market: createMockMarket({ status: PredictMarketStatus.OPEN }),
      });

      renderWithProvider(<PredictGameDetailsFooter {...props} />);

      expect(screen.getByTestId('game-details-footer')).toBeOnTheScreen();
    });
  });

  describe('testIDs', () => {
    it('renders with correct testID', () => {
      const props = createDefaultProps({ testID: 'custom-footer' });

      renderWithProvider(<PredictGameDetailsFooter {...props} />);

      expect(screen.getByTestId('custom-footer')).toBeOnTheScreen();
    });

    it('renders label with testID', () => {
      const props = createDefaultProps();

      renderWithProvider(<PredictGameDetailsFooter {...props} />);

      expect(screen.getByTestId('game-details-footer-label')).toBeOnTheScreen();
    });

    it('renders volume with testID', () => {
      const props = createDefaultProps();

      renderWithProvider(<PredictGameDetailsFooter {...props} />);

      expect(
        screen.getByTestId('game-details-footer-volume'),
      ).toBeOnTheScreen();
    });
  });

  describe('edge cases', () => {
    it('handles zero volume', () => {
      const props = createDefaultProps({
        market: createMockMarket({ volume: 0 }),
      });

      renderWithProvider(<PredictGameDetailsFooter {...props} />);

      expect(screen.getByText('$0 Vol')).toBeOnTheScreen();
    });

    it('handles undefined volume', () => {
      const props = createDefaultProps({
        market: createMockMarket({ volume: undefined }),
      });

      renderWithProvider(<PredictGameDetailsFooter {...props} />);

      expect(screen.getByText('$0 Vol')).toBeOnTheScreen();
    });
  });

  describe('gradient integration', () => {
    it('renders gradient when team colors are provided', () => {
      const props = createDefaultProps({
        awayColor: '#002244',
        homeColor: '#FB4F14',
      });

      renderWithProvider(<PredictGameDetailsFooter {...props} />);

      expect(
        screen.getByTestId('game-details-footer-gradient'),
      ).toBeOnTheScreen();
    });

    it('does not render gradient when colors are not provided', () => {
      const props = createDefaultProps();

      renderWithProvider(<PredictGameDetailsFooter {...props} />);

      expect(screen.queryByTestId('game-details-footer-gradient')).toBeNull();
    });

    it('does not render gradient when only awayColor is provided', () => {
      const props = createDefaultProps({
        awayColor: '#002244',
      });

      renderWithProvider(<PredictGameDetailsFooter {...props} />);

      expect(screen.queryByTestId('game-details-footer-gradient')).toBeNull();
    });

    it('does not render gradient when only homeColor is provided', () => {
      const props = createDefaultProps({
        homeColor: '#FB4F14',
      });

      renderWithProvider(<PredictGameDetailsFooter {...props} />);

      expect(screen.queryByTestId('game-details-footer-gradient')).toBeNull();
    });
  });
});
