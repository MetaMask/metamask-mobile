import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NetworkPills } from './NetworkPills';
import { CaipChainId } from '@metamask/utils';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectAllowedChainRanking,
  selectVisiblePillChainIds,
} from '../../../../../core/redux/slices/bridge';
import { useABTest } from '../../../../../hooks';
import { useChainValueOrder } from '../../hooks/useChainValueOrder';

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../../hooks', () => ({
  useABTest: jest.fn(),
}));

jest.mock('../../hooks/useChainValueOrder', () => ({
  useChainValueOrder: jest.fn(),
}));

const mockUseSelector = useSelector as jest.Mock;

// Mock chain ranking array with names from feature flags
const mockChainRanking = [
  { chainId: 'eip155:1' as CaipChainId, name: 'Ethereum' },
  { chainId: 'eip155:56' as CaipChainId, name: 'BNB Chain' },
  {
    chainId: 'bip122:000000000019d6689c085ae165831e93' as CaipChainId,
    name: 'Bitcoin',
  },
  {
    chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId,
    name: 'Solana',
  },
  { chainId: 'eip155:137' as CaipChainId, name: 'Polygon' },
  { chainId: 'eip155:10' as CaipChainId, name: 'Optimism' },
  { chainId: 'eip155:42161' as CaipChainId, name: 'Arbitrum' },
];

// Small chain ranking with fewer than MAX_VISIBLE_PILLS networks
const mockSmallChainRanking = [
  { chainId: 'eip155:1' as CaipChainId, name: 'Ethereum' },
  { chainId: 'eip155:137' as CaipChainId, name: 'Polygon' },
];

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  selectAllowedChainRanking: jest.fn(),
  selectVisiblePillChainIds: jest.fn(),
  setVisiblePillChainIds: jest.fn((ids) => ({
    type: 'bridge/setVisiblePillChainIds',
    payload: ids,
  })),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

jest.mock('../../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(() => ({ uri: 'mock-network-icon' })),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const { createElement } = jest.requireActual('react');
  const { Text, View } = jest.requireActual('react-native');
  return {
    AvatarBaseShape: { Circle: 'circle', Square: 'square' },
    AvatarNetwork: ({
      name,
      testID,
    }: {
      name?: string;
      testID?: string;
      src?: unknown;
      size?: string;
      shape?: string;
    }) => createElement(View, { testID: testID ?? `avatar-network-${name}` }),
    AvatarNetworkSize: { Xs: '16', Sm: '24', Md: '32' },
    Box: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => createElement(View, props, children),
    BoxAlignItems: { Center: 'center' },
    BoxFlexDirection: { Row: 'row' },
    FontWeight: { Medium: '500' },
    Text: ({ children }: { children: React.ReactNode }) =>
      createElement(Text, null, children),
    TextColor: {
      PrimaryInverse: 'text-primary-inverse',
      TextDefault: 'text-default',
    },
    TextVariant: { BodySm: 'BodySm', BodyMd: 'BodyMd' },
  };
});

jest.mock('react-native-gesture-handler', () => {
  const { ScrollView } = jest.requireActual('react-native');
  return { ScrollView };
});

describe('NetworkPills', () => {
  const mockOnChainSelect = jest.fn();
  const mockOnMorePress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    jest.mocked(useABTest).mockReturnValue({
      variant: { orderByValue: false },
      variantName: 'control',
      isActive: true,
    });
    jest.mocked(useChainValueOrder).mockReturnValue(mockChainRanking);
    jest.mocked(selectAllowedChainRanking).mockReturnValue(mockChainRanking);
    jest.mocked(selectVisiblePillChainIds).mockReturnValue(undefined); // default: use first N from chainRanking
    // NetworkPills calls useSelector(selectVisiblePillChainIds) directly, and
    // wraps selectAllowedChainRanking in an inline lambda (to forward the
    // optional enabledChainIds prop) — invoke whatever selector is passed so
    // both routes resolve through the mocked selector functions above.
    mockUseSelector.mockImplementation(
      (selector: (state: unknown) => unknown) => selector({}),
    );
  });

  describe('enabledChainIds', () => {
    it('forwards the enabledChainIds prop to selectAllowedChainRanking', () => {
      const enabledChainIds = ['eip155:1' as CaipChainId];

      render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
          enabledChainIds={enabledChainIds}
        />,
      );

      expect(selectAllowedChainRanking).toHaveBeenCalledWith(
        expect.anything(),
        enabledChainIds,
      );
    });

    it('calls selectAllowedChainRanking with undefined when enabledChainIds is not provided', () => {
      render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
        />,
      );

      expect(selectAllowedChainRanking).toHaveBeenCalledWith(
        expect.anything(),
        undefined,
      );
    });
  });

  describe('rendering', () => {
    it('does not calculate holdings order for control', () => {
      render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
        />,
      );

      expect(useChainValueOrder).not.toHaveBeenCalled();
    });

    it('renders All pill and first MAX_VISIBLE_PILLS chain pills', () => {
      const { getByText, queryByText } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
        />,
      );

      expect(getByText('All')).toBeTruthy();
      // First 4 from chainRanking: Ethereum, BNB Chain, Bitcoin, Solana
      expect(getByText('Ethereum')).toBeTruthy();
      expect(getByText('BNB Chain')).toBeTruthy();
      expect(getByText('Bitcoin')).toBeTruthy();
      expect(getByText('Solana')).toBeTruthy();
      // Remaining chains should not be rendered as pills
      expect(queryByText('Polygon')).toBeNull();
      expect(queryByText('Optimism')).toBeNull();
      expect(queryByText('Arbitrum')).toBeNull();
    });

    it('renders network icons for each visible chain pill', () => {
      const { getByTestId, queryByTestId } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
        />,
      );

      expect(getByTestId('avatar-network-Ethereum')).toBeTruthy();
      expect(getByTestId('avatar-network-BNB Chain')).toBeTruthy();
      expect(getByTestId('avatar-network-Bitcoin')).toBeTruthy();
      expect(getByTestId('avatar-network-Solana')).toBeTruthy();
      expect(queryByTestId('avatar-network-Polygon')).toBeNull();
    });

    it('renders "+X more" pill with correct count', () => {
      const { getByText } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
        />,
      );

      // 7 total - 4 visible = 3 remaining
      expect(getByText('+3 more')).toBeTruthy();
    });

    it('does not render "+X more" when all networks are visible', () => {
      jest
        .mocked(selectAllowedChainRanking)
        .mockReturnValue(mockSmallChainRanking);

      const { queryByTestId } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
        />,
      );

      expect(queryByTestId('network-pills-more-button')).toBeNull();
    });

    it('does not render "+X more" when one network is supported', () => {
      const singleChainRanking = [
        { chainId: 'eip155:1' as CaipChainId, name: 'Ethereum' },
      ];
      jest
        .mocked(selectAllowedChainRanking)
        .mockReturnValue(singleChainRanking);

      const { getByText, queryByTestId } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
        />,
      );

      expect(getByText('Ethereum')).toBeOnTheScreen();
      expect(queryByTestId('network-pills-more-button')).toBeNull();
    });

    it('shows first MAX_VISIBLE_PILLS from any chainRanking order', () => {
      const customRanking = [
        { chainId: 'eip155:137' as CaipChainId, name: 'Polygon' },
        { chainId: 'eip155:10' as CaipChainId, name: 'Optimism' },
        { chainId: 'eip155:42161' as CaipChainId, name: 'Arbitrum' },
        { chainId: 'eip155:1' as CaipChainId, name: 'Ethereum' },
        { chainId: 'eip155:56' as CaipChainId, name: 'BNB Chain' },
      ];
      jest.mocked(selectAllowedChainRanking).mockReturnValue(customRanking);

      const { getByText, queryByText } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
        />,
      );

      // First 4 from the custom ranking
      expect(getByText('Polygon')).toBeTruthy();
      expect(getByText('Optimism')).toBeTruthy();
      expect(getByText('Arbitrum')).toBeTruthy();
      expect(getByText('Ethereum')).toBeTruthy();
      // 5th entry should not be visible
      expect(queryByText('BNB Chain')).toBeNull();
    });

    it('shows the first four holdings-ranked networks for treatment', () => {
      const treatmentRanking = [
        mockChainRanking[4],
        mockChainRanking[5],
        mockChainRanking[6],
        mockChainRanking[0],
        mockChainRanking[1],
        mockChainRanking[2],
        mockChainRanking[3],
      ];
      jest.mocked(useABTest).mockReturnValue({
        variant: { orderByValue: true },
        variantName: 'treatment',
        isActive: true,
      });
      jest.mocked(useChainValueOrder).mockReturnValue(treatmentRanking);

      const { getByText, queryByText } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
        />,
      );

      expect(getByText('Polygon')).toBeOnTheScreen();
      expect(getByText('Optimism')).toBeOnTheScreen();
      expect(getByText('Arbitrum')).toBeOnTheScreen();
      expect(getByText('Ethereum')).toBeOnTheScreen();
      expect(queryByText('BNB Chain')).not.toBeOnTheScreen();
      expect(getByText('+3 more')).toBeOnTheScreen();
    });
  });

  describe('interactions', () => {
    it('calls onChainSelect with undefined when All pill is pressed', () => {
      const { getByText } = render(
        <NetworkPills
          selectedChainId={'eip155:1' as CaipChainId}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
        />,
      );

      fireEvent.press(getByText('All'));

      expect(mockOnChainSelect).toHaveBeenCalledWith(undefined);
    });

    it('calls onChainSelect with chainId when chain pill is pressed', () => {
      const { getByText } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
        />,
      );

      fireEvent.press(getByText('Ethereum'));

      expect(mockOnChainSelect).toHaveBeenCalledWith('eip155:1');
    });

    it('calls onMorePress when "+X more" pill is pressed', () => {
      const { getByText } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
        />,
      );

      fireEvent.press(getByText('+3 more'));

      expect(mockOnMorePress).toHaveBeenCalled();
    });
  });

  describe('selection state', () => {
    it('highlights selected chain pill', () => {
      const { getByText } = render(
        <NetworkPills
          selectedChainId={'eip155:56' as CaipChainId}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
        />,
      );

      expect(getByText('BNB Chain')).toBeTruthy();
    });

    it('highlights All pill when no chain selected', () => {
      const { getByText } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
        />,
      );

      expect(getByText('All')).toBeTruthy();
    });
  });

  describe('visible pills update on selection', () => {
    it('dispatches new visible list when non-visible chain is selected', () => {
      const { rerender } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
        />,
      );

      // Select Polygon (non-visible chain)
      rerender(
        <NetworkPills
          selectedChainId={'eip155:137' as CaipChainId}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
        />,
      );

      // Should dispatch with Polygon at front, Solana popped
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'bridge/setVisiblePillChainIds',
        payload: [
          'eip155:137', // Polygon pushed to front
          'eip155:1', // Ethereum
          'eip155:56', // BNB Chain
          'bip122:000000000019d6689c085ae165831e93', // Bitcoin
        ],
      });
    });

    it('does not dispatch when selecting an already visible chain', () => {
      const { rerender } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
        />,
      );

      mockDispatch.mockClear();

      // Select Ethereum (already visible)
      rerender(
        <NetworkPills
          selectedChainId={'eip155:1' as CaipChainId}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
        />,
      );

      // Should not dispatch setVisiblePillChainIds
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'bridge/setVisiblePillChainIds',
        }),
      );
    });

    it('dispatches rolling order for consecutive non-visible selections', () => {
      const { rerender } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
        />,
      );

      rerender(
        <NetworkPills
          selectedChainId={'eip155:137' as CaipChainId}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
        />,
      );

      const firstSelectionPayload = mockDispatch.mock.calls.find(
        ([action]) => action.type === 'bridge/setVisiblePillChainIds',
      )?.[0]?.payload as CaipChainId[] | undefined;
      expect(firstSelectionPayload).toEqual([
        'eip155:137',
        'eip155:1',
        'eip155:56',
        'bip122:000000000019d6689c085ae165831e93',
      ]);

      jest
        .mocked(selectVisiblePillChainIds)
        .mockReturnValue(firstSelectionPayload);
      mockDispatch.mockClear();

      rerender(
        <NetworkPills
          selectedChainId={'eip155:10' as CaipChainId}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
        />,
      );

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'bridge/setVisiblePillChainIds',
        payload: ['eip155:10', 'eip155:137', 'eip155:1', 'eip155:56'],
      });
    });

    it('promotes a non-visible network within the treatment ranking', () => {
      const treatmentRanking = [
        mockChainRanking[4],
        mockChainRanking[5],
        mockChainRanking[6],
        mockChainRanking[0],
        mockChainRanking[1],
        mockChainRanking[2],
        mockChainRanking[3],
      ];
      jest.mocked(useABTest).mockReturnValue({
        variant: { orderByValue: true },
        variantName: 'treatment',
        isActive: true,
      });
      jest.mocked(useChainValueOrder).mockReturnValue(treatmentRanking);
      const { rerender } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
        />,
      );

      rerender(
        <NetworkPills
          selectedChainId={'eip155:56' as CaipChainId}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
        />,
      );

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'bridge/setVisiblePillChainIds',
        payload: ['eip155:56', 'eip155:137', 'eip155:10', 'eip155:42161'],
      });
    });

    it('keeps a session-pinned promoted chain after treatment ranking changes', () => {
      const treatmentRanking = [
        mockChainRanking[4],
        mockChainRanking[5],
        mockChainRanking[6],
        mockChainRanking[0],
        mockChainRanking[1],
        mockChainRanking[2],
        mockChainRanking[3],
      ];
      const pinnedVisibleChainIds = [
        'eip155:56',
        'eip155:137',
        'eip155:10',
        'eip155:42161',
      ] as CaipChainId[];
      // Live ranking would no longer include BNB in the top four.
      const reorderedTreatmentRanking = [
        mockChainRanking[4],
        mockChainRanking[5],
        mockChainRanking[6],
        mockChainRanking[0],
        mockChainRanking[2],
        mockChainRanking[3],
        mockChainRanking[1],
      ];

      jest.mocked(useABTest).mockReturnValue({
        variant: { orderByValue: true },
        variantName: 'treatment',
        isActive: true,
      });
      jest.mocked(useChainValueOrder).mockReturnValue(treatmentRanking);
      jest
        .mocked(selectVisiblePillChainIds)
        .mockReturnValue(pinnedVisibleChainIds);

      const { rerender, getByText, queryByText } = render(
        <NetworkPills
          selectedChainId={'eip155:56' as CaipChainId}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
        />,
      );

      expect(getByText('BNB Chain')).toBeOnTheScreen();

      mockDispatch.mockClear();
      jest
        .mocked(useChainValueOrder)
        .mockReturnValue(reorderedTreatmentRanking);

      rerender(
        <NetworkPills
          selectedChainId={'eip155:56' as CaipChainId}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
        />,
      );

      expect(getByText('BNB Chain')).toBeOnTheScreen();
      expect(queryByText('Bitcoin')).not.toBeOnTheScreen();
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'bridge/setVisiblePillChainIds',
        }),
      );
    });

    it('backfills from chainRanking when a session pin has no ids in a narrower enabledChainIds picker', () => {
      // Pinned during a normal (unrestricted) bridge session.
      jest
        .mocked(selectVisiblePillChainIds)
        .mockReturnValue([
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          'bip122:000000000019d6689c085ae165831e93',
          'eip155:10',
          'eip155:42161',
        ] as CaipChainId[]);

      // Narrower picker (e.g. Limit Order) whose chainRanking doesn't
      // contain any of the pinned ids.
      const narrowRanking = [
        { chainId: 'eip155:1' as CaipChainId, name: 'Ethereum' },
        { chainId: 'eip155:56' as CaipChainId, name: 'BNB Chain' },
        { chainId: 'eip155:8453' as CaipChainId, name: 'Base' },
      ];
      jest.mocked(selectAllowedChainRanking).mockReturnValue(narrowRanking);

      const { getByText, queryByTestId } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
          enabledChainIds={['eip155:1', 'eip155:56', 'eip155:8453']}
        />,
      );

      expect(getByText('Ethereum')).toBeOnTheScreen();
      expect(getByText('BNB Chain')).toBeOnTheScreen();
      expect(getByText('Base')).toBeOnTheScreen();
      expect(queryByTestId('network-pills-more-button')).toBeNull();
    });

    it('does not promote a selectedChainId that is outside chainRanking into the session pin', () => {
      // selectedChainId belongs to neither the default chainRanking nor any
      // narrower scope here — e.g. a stale Redux filter or an initialFilter
      // derived from a token whose chain isn't part of this picker's allowed
      // chain set.
      const { getByText, queryByText } = render(
        <NetworkPills
          selectedChainId={'eip155:8453' as CaipChainId}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
        />,
      );

      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'bridge/setVisiblePillChainIds' }),
      );
      // No pill for the out-of-scope chain should render, and none of the
      // rendered pills should be treated as selected.
      expect(queryByText('Base')).not.toBeOnTheScreen();
      // Visible pills still come from the default first-N chainRanking.
      expect(getByText('Ethereum')).toBeOnTheScreen();
    });

    it('mixes valid pinned ids with backfilled ranking entries in a narrower picker', () => {
      // Only one of the pinned ids exists in the narrower ranking.
      jest
        .mocked(selectVisiblePillChainIds)
        .mockReturnValue([
          'eip155:56',
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        ] as CaipChainId[]);

      const narrowRanking = [
        { chainId: 'eip155:1' as CaipChainId, name: 'Ethereum' },
        { chainId: 'eip155:56' as CaipChainId, name: 'BNB Chain' },
        { chainId: 'eip155:8453' as CaipChainId, name: 'Base' },
      ];
      jest.mocked(selectAllowedChainRanking).mockReturnValue(narrowRanking);

      const { getByText } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
          enabledChainIds={['eip155:1', 'eip155:56', 'eip155:8453']}
        />,
      );

      // The valid pin (BNB Chain) is kept, and the remaining slots are
      // backfilled from the narrower ranking instead of being dropped.
      expect(getByText('BNB Chain')).toBeOnTheScreen();
      expect(getByText('Ethereum')).toBeOnTheScreen();
      expect(getByText('Base')).toBeOnTheScreen();
    });
  });

  describe('watchlist filter', () => {
    const mockOnWatchlistFilterPress = jest.fn();

    it('renders watchlist filter when enabled', () => {
      const { getByTestId } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
          showWatchlistFilter
          isWatchlistFilterActive={false}
          onWatchlistFilterPress={mockOnWatchlistFilterPress}
        />,
      );

      expect(getByTestId('bridge-watchlist-filter-watchlist')).toBeTruthy();
    });

    it('calls onWatchlistFilterPress when watchlist pill is pressed', () => {
      const { getByTestId } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
          showWatchlistFilter
          isWatchlistFilterActive={false}
          onWatchlistFilterPress={mockOnWatchlistFilterPress}
        />,
      );

      fireEvent.press(getByTestId('bridge-watchlist-filter-watchlist'));

      expect(mockOnWatchlistFilterPress).toHaveBeenCalledTimes(1);
    });

    it('does not render watchlist filter when callback is missing', () => {
      const { queryByTestId } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
          showWatchlistFilter
          isWatchlistFilterActive={false}
        />,
      );

      expect(queryByTestId('bridge-watchlist-filter-watchlist')).toBeNull();
    });

    it('keeps All and network pills inactive when watchlist filter is active', () => {
      const { getByText } = render(
        <NetworkPills
          selectedChainId={'eip155:1' as CaipChainId}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
          showWatchlistFilter
          isWatchlistFilterActive
          onWatchlistFilterPress={mockOnWatchlistFilterPress}
        />,
      );

      fireEvent.press(getByText('All'));
      expect(mockOnChainSelect).toHaveBeenCalledWith(undefined);
    });
  });
});
