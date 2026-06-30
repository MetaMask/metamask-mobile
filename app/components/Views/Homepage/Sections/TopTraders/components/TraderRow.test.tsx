import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import type { ReactTestInstance } from 'react-test-renderer';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import type { TopTrader } from '../types';
import TraderRow from './TraderRow';

const baseTrader: TopTrader = {
  id: 'trader-1',
  address: '0x0000000000000000000000000000000000000001',
  rank: 1,
  overallRank: 1,
  username: 'alpha.eth',
  avatarUri: 'https://example.com/avatar.png',
  percentageChange: 43,
  pnlValue: 963146.8,
  pnlPerChain: { base: 963146.8 },
  isFollowing: false,
};

const mockOnFollowPress = jest.fn();
const mockOnTraderPress = jest.fn();

describe('TraderRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders username and the full (non-abbreviated) PnL', () => {
    renderWithProvider(
      <TraderRow trader={baseTrader} onFollowPress={mockOnFollowPress} />,
    );
    expect(screen.getByText('alpha.eth')).toBeOnTheScreen();
    expect(screen.getByText('+$963,146.80')).toBeOnTheScreen();
  });

  it('does not render the abbreviated PnL, ROI %, or timeframe suffix', () => {
    renderWithProvider(
      <TraderRow trader={baseTrader} onFollowPress={mockOnFollowPress} />,
    );
    expect(screen.queryByText('+$963.1K')).toBeNull();
    expect(screen.queryByText('+43.0%')).toBeNull();
    expect(screen.queryByText(/30D/)).toBeNull();
    expect(screen.queryByText(/7D/)).toBeNull();
  });

  it('renders a podium medal for ranks 1-3', () => {
    renderWithProvider(
      <TraderRow trader={baseTrader} onFollowPress={mockOnFollowPress} />,
    );
    expect(screen.getByTestId('rank-medal-1')).toBeOnTheScreen();
  });

  it('does not render a podium medal for ranks outside 1-3', () => {
    const offPodium = { ...baseTrader, rank: 4 };
    renderWithProvider(
      <TraderRow trader={offPodium} onFollowPress={mockOnFollowPress} />,
    );
    expect(screen.queryByTestId('rank-medal-4')).toBeNull();
    expect(screen.queryByTestId('rank-medal-1')).toBeNull();
  });

  it('renders avatar image when avatarUri is present', () => {
    renderWithProvider(
      <TraderRow trader={baseTrader} onFollowPress={mockOnFollowPress} />,
    );
    expect(screen.getByTestId('trader-row-trader-1')).toBeOnTheScreen();
  });

  it('caches the avatar with expo-image and a per-row recyclingKey so fast FlatList scrolling does not re-fetch avatars on cell reuse', () => {
    renderWithProvider(
      <TraderRow trader={baseTrader} onFollowPress={mockOnFollowPress} />,
    );

    const image = screen.UNSAFE_getByType(Image);
    expect(image.props.cachePolicy).toBe('memory-disk');
    expect(image.props.recyclingKey).toBe(baseTrader.id);
  });

  it('renders Maskicon fallback when avatarUri is absent', () => {
    const traderNoAvatar = { ...baseTrader, avatarUri: undefined };
    renderWithProvider(
      <TraderRow trader={traderNoAvatar} onFollowPress={mockOnFollowPress} />,
    );
    expect(screen.getByTestId('trader-row-trader-1')).toBeOnTheScreen();
  });

  it('shows Follow when not following', () => {
    renderWithProvider(
      <TraderRow trader={baseTrader} onFollowPress={mockOnFollowPress} />,
    );
    expect(screen.getByText('Follow')).toBeOnTheScreen();
  });

  it('shows Following when isFollowing is true', () => {
    const followingTrader = { ...baseTrader, isFollowing: true };
    renderWithProvider(
      <TraderRow trader={followingTrader} onFollowPress={mockOnFollowPress} />,
    );
    expect(screen.getByText('Following')).toBeOnTheScreen();
  });

  it('calls onFollowPress with trader.id', () => {
    renderWithProvider(
      <TraderRow trader={baseTrader} onFollowPress={mockOnFollowPress} />,
    );
    fireEvent.press(screen.getByText('Follow'));
    expect(mockOnFollowPress).toHaveBeenCalledWith('trader-1');
  });

  it('calls onTraderPress when pressed and prop is provided', () => {
    renderWithProvider(
      <TraderRow
        trader={baseTrader}
        onFollowPress={mockOnFollowPress}
        onTraderPress={mockOnTraderPress}
      />,
    );
    fireEvent.press(screen.getByText('alpha.eth'));
    expect(mockOnTraderPress).toHaveBeenCalledWith('trader-1', 'alpha.eth', 1);
  });

  it('forwards trader.overallRank (not the filtered rank) to onTraderPress so the profile podium gates on true top-3 traders', () => {
    const filteredTrader: TopTrader = {
      ...baseTrader,
      rank: 1,
      overallRank: 50,
    };
    renderWithProvider(
      <TraderRow
        trader={filteredTrader}
        onFollowPress={mockOnFollowPress}
        onTraderPress={mockOnTraderPress}
      />,
    );

    fireEvent.press(screen.getByText('alpha.eth'));

    expect(mockOnTraderPress).toHaveBeenCalledWith('trader-1', 'alpha.eth', 50);
  });

  it('does not fire onTraderPress when the prop is undefined', () => {
    renderWithProvider(
      <TraderRow trader={baseTrader} onFollowPress={mockOnFollowPress} />,
    );
    fireEvent.press(screen.getByText('alpha.eth'));
    expect(mockOnTraderPress).not.toHaveBeenCalled();
  });

  it('displays negative PnL values with a leading minus', () => {
    const negativeTrader: TopTrader = {
      ...baseTrader,
      percentageChange: -15.3,
      pnlValue: -500,
    };
    renderWithProvider(
      <TraderRow trader={negativeTrader} onFollowPress={mockOnFollowPress} />,
    );
    expect(screen.getByText('-$500.00')).toBeOnTheScreen();
  });

  it('uses custom testID when provided', () => {
    renderWithProvider(
      <TraderRow
        trader={baseTrader}
        onFollowPress={mockOnFollowPress}
        testID="custom-test-id"
      />,
    );
    expect(screen.getByTestId('custom-test-id')).toBeOnTheScreen();
  });

  describe('layout stability', () => {
    const findAncestor = (
      start: ReactTestInstance | null,
      predicate: (node: ReactTestInstance) => boolean,
    ): ReactTestInstance | null => {
      let node: ReactTestInstance | null = start;
      while (node) {
        if (predicate(node)) return node;
        node = node.parent;
      }
      return null;
    };

    const resolveAlignSelf = (node: ReactTestInstance): string | undefined => {
      const flat = StyleSheet.flatten(node.props.style) as
        | { alignSelf?: string }
        | undefined;
      return flat?.alignSelf;
    };

    const resolveHeight = (node: ReactTestInstance): number | undefined => {
      const flat = StyleSheet.flatten(node.props.style);
      if (Array.isArray(flat)) {
        for (const entry of flat) {
          if (entry && typeof entry === 'object' && 'height' in entry) {
            return (entry as { height?: number }).height;
          }
        }
        return undefined;
      }
      return (flat as { height?: number } | undefined)?.height;
    };

    const resolveMinWidth = (node: ReactTestInstance): number | undefined => {
      const flat = StyleSheet.flatten(node.props.style) as
        | { minWidth?: number }
        | undefined;
      return flat?.minWidth;
    };

    it('renders the stats line with numberOfLines=1 so it does not wrap when the button grows', () => {
      const trader: TopTrader = {
        ...baseTrader,
        pnlValue: 407000,
      };
      renderWithProvider(
        <TraderRow trader={trader} onFollowPress={mockOnFollowPress} />,
      );

      const pnlSegment = screen.getByText('+$407,000.00');
      const statsText = findAncestor(
        pnlSegment,
        (node) => node.props?.numberOfLines === 1,
      );

      expect(statsText).not.toBeNull();
    });

    it('uses ButtonSize.Sm (32px height from the design system)', () => {
      renderWithProvider(
        <TraderRow trader={baseTrader} onFollowPress={mockOnFollowPress} />,
      );

      const followLabel = screen.getByText('Follow');
      const buttonWithHeight = findAncestor(
        followLabel,
        (node) => resolveHeight(node) === 32,
      );

      expect(buttonWithHeight).not.toBeNull();
    });

    it('applies 8px horizontal padding to match the Following state visually', () => {
      renderWithProvider(
        <TraderRow trader={baseTrader} onFollowPress={mockOnFollowPress} />,
      );

      const followLabel = screen.getByText('Follow');
      const buttonWithPadding = findAncestor(followLabel, (node) => {
        const flat = StyleSheet.flatten(node.props.style) as
          | { paddingLeft?: number; paddingRight?: number }
          | undefined;
        return flat?.paddingLeft === 8 && flat?.paddingRight === 8;
      });

      expect(buttonWithPadding).not.toBeNull();
    });

    it('sets min-width 60px on the Follow button so the label is not clipped', () => {
      renderWithProvider(
        <TraderRow trader={baseTrader} onFollowPress={mockOnFollowPress} />,
      );

      const followLabel = screen.getByText('Follow');
      const buttonWithMinWidth = findAncestor(
        followLabel,
        (node) => resolveMinWidth(node) === 60,
      );

      expect(buttonWithMinWidth).not.toBeNull();
    });

    it('uses the same min-width on the Following button so the longer label can grow naturally', () => {
      const followingTrader: TopTrader = { ...baseTrader, isFollowing: true };
      renderWithProvider(
        <TraderRow
          trader={followingTrader}
          onFollowPress={mockOnFollowPress}
        />,
      );

      const followingLabel = screen.getByText('Following');
      const buttonWithMinWidth = findAncestor(
        followingLabel,
        (node) => resolveMinWidth(node) === 60,
      );

      expect(buttonWithMinWidth).not.toBeNull();
    });

    it('vertically centers the Follow button so it sits in the middle of the row (overrides ButtonBase self-start default)', () => {
      renderWithProvider(
        <TraderRow trader={baseTrader} onFollowPress={mockOnFollowPress} />,
      );

      const followLabel = screen.getByText('Follow');
      const buttonWithAlignSelf = findAncestor(
        followLabel,
        (node) => resolveAlignSelf(node) === 'center',
      );

      expect(buttonWithAlignSelf).not.toBeNull();
    });
  });
});
