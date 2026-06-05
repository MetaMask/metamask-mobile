import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import type { TopTrader } from '../types';
import TraderRow from './TraderRow';

const baseTrader: TopTrader = {
  id: 'trader-1',
  address: '0x0000000000000000000000000000000000000001',
  rank: 1,
  overallRank: 1,
  username: 'sniperliquid',
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

  it('renders rank, username, ROI, and PnL', () => {
    renderWithProvider(
      <TraderRow trader={baseTrader} onFollowPress={mockOnFollowPress} />,
    );
    expect(screen.getByText('1')).toBeOnTheScreen();
    expect(screen.getByText('sniperliquid')).toBeOnTheScreen();
    expect(screen.getByText('+43.0%')).toBeOnTheScreen();
    expect(screen.getByText('+$963K')).toBeOnTheScreen();
  });

  it('renders avatar image when avatarUri is present', () => {
    renderWithProvider(
      <TraderRow trader={baseTrader} onFollowPress={mockOnFollowPress} />,
    );
    expect(screen.getByTestId('trader-row-trader-1')).toBeOnTheScreen();
  });

  it('renders fallback AvatarBase when avatarUri is absent', () => {
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
    fireEvent.press(screen.getByText('sniperliquid'));
    expect(mockOnTraderPress).toHaveBeenCalledWith(
      'trader-1',
      'sniperliquid',
      1,
    );
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

    fireEvent.press(screen.getByText('sniperliquid'));

    expect(mockOnTraderPress).toHaveBeenCalledWith(
      'trader-1',
      'sniperliquid',
      50,
    );
  });

  it('does not fire onTraderPress when the prop is undefined', () => {
    renderWithProvider(
      <TraderRow trader={baseTrader} onFollowPress={mockOnFollowPress} />,
    );
    fireEvent.press(screen.getByText('sniperliquid'));
    expect(mockOnTraderPress).not.toHaveBeenCalled();
  });

  it('displays negative ROI and PnL values', () => {
    const negativeTrader: TopTrader = {
      ...baseTrader,
      percentageChange: -15.3,
      pnlValue: -500,
    };
    renderWithProvider(
      <TraderRow trader={negativeTrader} onFollowPress={mockOnFollowPress} />,
    );
    expect(screen.getByText('-15.3%')).toBeOnTheScreen();
    expect(screen.getByText('-$500')).toBeOnTheScreen();
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

  describe('layout stability (prevents Follow/Following toggle shift)', () => {
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

    const resolveMinWidth = (node: ReactTestInstance): number | undefined => {
      const flat = StyleSheet.flatten(node.props.style) as
        | { minWidth?: number }
        | undefined;
      return flat?.minWidth;
    };

    const resolveAlignSelf = (node: ReactTestInstance): string | undefined => {
      const flat = StyleSheet.flatten(node.props.style) as
        | { alignSelf?: string }
        | undefined;
      return flat?.alignSelf;
    };

    it('renders the stats line with numberOfLines=1 so it does not wrap when the button grows', () => {
      const trader: TopTrader = {
        ...baseTrader,
        percentageChange: 28233,
        pnlValue: 407000,
      };
      renderWithProvider(
        <TraderRow trader={trader} onFollowPress={mockOnFollowPress} />,
      );

      const roiSegment = screen.getByText('+28233.0%');
      const statsText = findAncestor(
        roiSegment,
        (node) => node.props?.numberOfLines === 1,
      );

      expect(statsText).not.toBeNull();
    });

    it('renders the Follow button with a minimum width', () => {
      renderWithProvider(
        <TraderRow trader={baseTrader} onFollowPress={mockOnFollowPress} />,
      );

      const followLabel = screen.getByText('Follow');
      const buttonWithMinWidth = findAncestor(
        followLabel,
        (node) => resolveMinWidth(node) !== undefined,
      );

      expect(buttonWithMinWidth).not.toBeNull();
      expect(resolveMinWidth(buttonWithMinWidth as ReactTestInstance)).toBe(96);
    });

    it('renders the rank on a single line so the trailing dot does not wrap for double-digit ranks', () => {
      const doubleDigitTrader: TopTrader = {
        ...baseTrader,
        rank: 20,
        overallRank: 20,
      };
      renderWithProvider(
        <TraderRow
          trader={doubleDigitTrader}
          onFollowPress={mockOnFollowPress}
        />,
      );

      const rankText = screen.getByText('20');

      expect(rankText.props.numberOfLines).toBe(1);
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

    it('keeps the same minimum width when toggling between Follow and Following', () => {
      const { rerender } = renderWithProvider(
        <TraderRow trader={baseTrader} onFollowPress={mockOnFollowPress} />,
      );

      const followLabel = screen.getByText('Follow');
      const followButton = findAncestor(
        followLabel,
        (node) => resolveMinWidth(node) !== undefined,
      );
      const followMinWidth = resolveMinWidth(followButton as ReactTestInstance);

      rerender(
        <TraderRow
          trader={{ ...baseTrader, isFollowing: true }}
          onFollowPress={mockOnFollowPress}
        />,
      );

      const followingLabel = screen.getByText('Following');
      const followingButton = findAncestor(
        followingLabel,
        (node) => resolveMinWidth(node) !== undefined,
      );
      const followingMinWidth = resolveMinWidth(
        followingButton as ReactTestInstance,
      );

      expect(followMinWidth).toBeDefined();
      expect(followingMinWidth).toBe(followMinWidth);
    });
  });
});
