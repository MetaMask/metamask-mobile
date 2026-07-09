import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { PerpsMarketData } from '@metamask/perps-controller';
import PerpsRecentlyAddedSection from './PerpsRecentlyAddedSection';
import { PerpsHomeViewSelectorsIDs } from '../../Perps.testIds';

// Stub design-system components that pull in native modules
jest.mock('@metamask/design-system-react-native', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    SectionDivider: () => <View testID="section-divider" />,
    SectionHeader: ({ title, testID }: { title: string; testID?: string }) => (
      <Text testID={testID}>{title}</Text>
    ),
  };
});

jest.mock('../PerpsTokenLogo/PerpsTokenLogo', () => {
  const { View } = jest.requireActual('react-native');
  return ({ symbol }: { symbol: string }) => (
    <View testID={`token-logo-${symbol}`} />
  );
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

// Fix Date.now so formatTimeSinceListing is deterministic
const NOW = 1_750_000_000_000;
beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});
afterEach(() => {
  jest.restoreAllMocks();
});

const createMarket = (
  overrides: Partial<PerpsMarketData> = {},
): PerpsMarketData => ({
  symbol: 'BTC',
  name: 'Bitcoin',
  maxLeverage: '40x',
  price: '$50,000.00',
  change24h: '+2.5%',
  change24hPercent: '+2.5%',
  volume: '$1.2B',
  listedAt: NOW - 3 * 60 * 60 * 1000, // 3 hours ago
  ...overrides,
});

describe('PerpsRecentlyAddedSection', () => {
  describe('visibility', () => {
    it('returns null and renders nothing when the markets list is empty', () => {
      const { toJSON } = render(
        <PerpsRecentlyAddedSection markets={[]} onMarketPress={jest.fn()} />,
      );
      expect(toJSON()).toBeNull();
    });

    it('renders the section when at least one market is provided', () => {
      render(
        <PerpsRecentlyAddedSection
          markets={[createMarket()]}
          onMarketPress={jest.fn()}
        />,
      );
      expect(
        screen.getByTestId(PerpsHomeViewSelectorsIDs.RECENTLY_ADDED_SECTION),
      ).toBeOnTheScreen();
    });
  });

  describe('structure', () => {
    it('renders the header with the recently_added string key', () => {
      render(
        <PerpsRecentlyAddedSection
          markets={[createMarket()]}
          onMarketPress={jest.fn()}
        />,
      );
      expect(
        screen.getByTestId(PerpsHomeViewSelectorsIDs.RECENTLY_ADDED_HEADER),
      ).toHaveTextContent('perps.home.recently_added');
    });

    it('renders a tile for each market', () => {
      const markets = [
        createMarket({ symbol: 'BTC' }),
        createMarket({ symbol: 'ETH', name: 'Ethereum' }),
        createMarket({ symbol: 'SOL', name: 'Solana' }),
      ];

      render(
        <PerpsRecentlyAddedSection
          markets={markets}
          onMarketPress={jest.fn()}
        />,
      );

      expect(
        screen.getByTestId('perps-recently-added-tile-BTC'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('perps-recently-added-tile-ETH'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('perps-recently-added-tile-SOL'),
      ).toBeOnTheScreen();
    });

    it('renders each market logo', () => {
      const markets = [
        createMarket({ symbol: 'BTC' }),
        createMarket({ symbol: 'ETH', name: 'Ethereum' }),
      ];

      render(
        <PerpsRecentlyAddedSection
          markets={markets}
          onMarketPress={jest.fn()}
        />,
      );

      expect(screen.getByTestId('token-logo-BTC')).toBeOnTheScreen();
      expect(screen.getByTestId('token-logo-ETH')).toBeOnTheScreen();
    });
  });

  describe('tile content', () => {
    it('displays the market symbol', () => {
      render(
        <PerpsRecentlyAddedSection
          markets={[createMarket({ symbol: 'BTC' })]}
          onMarketPress={jest.fn()}
        />,
      );
      expect(screen.getByText('BTC')).toBeOnTheScreen();
    });

    it('displays the market price', () => {
      render(
        <PerpsRecentlyAddedSection
          markets={[createMarket({ price: '$50,000.00' })]}
          onMarketPress={jest.fn()}
        />,
      );
      expect(screen.getByText('$50,000.00')).toBeOnTheScreen();
    });

    it('displays the 24h percent change', () => {
      render(
        <PerpsRecentlyAddedSection
          markets={[createMarket({ change24hPercent: '+2.5%' })]}
          onMarketPress={jest.fn()}
        />,
      );
      expect(screen.getByText('+2.5%')).toBeOnTheScreen();
    });

    it('displays "3h ago" for a market listed 3 hours ago', () => {
      const market = createMarket({
        listedAt: NOW - 3 * 60 * 60 * 1000,
      });

      render(
        <PerpsRecentlyAddedSection
          markets={[market]}
          onMarketPress={jest.fn()}
        />,
      );

      expect(screen.getByText('3h ago')).toBeOnTheScreen();
    });

    it('displays "1 day ago" for a market listed 1 day ago', () => {
      const market = createMarket({
        listedAt: NOW - 24 * 60 * 60 * 1000,
      });

      render(
        <PerpsRecentlyAddedSection
          markets={[market]}
          onMarketPress={jest.fn()}
        />,
      );

      expect(screen.getByText('1 day ago')).toBeOnTheScreen();
    });

    it('displays "5 days ago" for a market listed 5 days ago', () => {
      const market = createMarket({
        listedAt: NOW - 5 * 24 * 60 * 60 * 1000,
      });

      render(
        <PerpsRecentlyAddedSection
          markets={[market]}
          onMarketPress={jest.fn()}
        />,
      );

      expect(screen.getByText('5 days ago')).toBeOnTheScreen();
    });

    it('does not render a time label when listedAt is undefined', () => {
      const market = createMarket({ listedAt: undefined });

      render(
        <PerpsRecentlyAddedSection
          markets={[market]}
          onMarketPress={jest.fn()}
        />,
      );

      // Tile still renders, but no time text element
      expect(
        screen.getByTestId('perps-recently-added-tile-BTC'),
      ).toBeOnTheScreen();
      expect(screen.queryByText(/ago/)).toBeNull();
    });
  });

  describe('ordering', () => {
    it('renders markets in the order provided (newest first, as sorted by the hook)', () => {
      const markets = [
        createMarket({ symbol: 'NEWEST', listedAt: NOW - 1 * 60 * 60 * 1000 }),
        createMarket({ symbol: 'MIDDLE', listedAt: NOW - 5 * 60 * 60 * 1000 }),
        createMarket({ symbol: 'OLDEST', listedAt: NOW - 10 * 60 * 60 * 1000 }),
      ];

      render(
        <PerpsRecentlyAddedSection
          markets={markets}
          onMarketPress={jest.fn()}
        />,
      );

      const tiles = screen.getAllByTestId(/^perps-recently-added-tile-/);
      expect(tiles[0].props.testID).toBe('perps-recently-added-tile-NEWEST');
      expect(tiles[1].props.testID).toBe('perps-recently-added-tile-MIDDLE');
      expect(tiles[2].props.testID).toBe('perps-recently-added-tile-OLDEST');
    });
  });

  describe('interaction', () => {
    it('calls onMarketPress with the correct market when a tile is pressed', () => {
      const onMarketPress = jest.fn();
      const market = createMarket({ symbol: 'BTC' });

      render(
        <PerpsRecentlyAddedSection
          markets={[market]}
          onMarketPress={onMarketPress}
        />,
      );

      fireEvent.press(screen.getByTestId('perps-recently-added-tile-BTC'));

      expect(onMarketPress).toHaveBeenCalledTimes(1);
      expect(onMarketPress).toHaveBeenCalledWith(market);
    });

    it('calls onMarketPress with the correct market when one of many tiles is pressed', () => {
      const onMarketPress = jest.fn();
      const btc = createMarket({ symbol: 'BTC' });
      const eth = createMarket({ symbol: 'ETH', name: 'Ethereum' });

      render(
        <PerpsRecentlyAddedSection
          markets={[btc, eth]}
          onMarketPress={onMarketPress}
        />,
      );

      fireEvent.press(screen.getByTestId('perps-recently-added-tile-ETH'));

      expect(onMarketPress).toHaveBeenCalledWith(eth);
      expect(onMarketPress).not.toHaveBeenCalledWith(btc);
    });
  });
});
