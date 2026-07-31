import React from 'react';
import type { DeFiProtocolPositionGroup } from '@metamask/assets-controllers';
import { act, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import DeFiPositionsListV2 from './DeFiPositionsListV2';
import type { UseDeFiPositionsV2Result } from '../hooks/useDeFiPositionsV2';
import { strings } from '../../../../../../locales/i18n';
import { WalletViewSelectorsIDs } from '../../../../Views/Wallet/WalletView.testIds';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { AnalyticsEventBuilder } from '../../../../../util/analytics/AnalyticsEventBuilder';

const mockUseDeFiPositionsV2 = jest.fn();
jest.mock('../hooks/useDeFiPositionsV2', () => ({
  useDeFiPositionsV2: (opts: unknown) => mockUseDeFiPositionsV2(opts),
}));

const mockSelectTokenSortConfig = jest.fn();
const mockSelectPrivacyMode = jest.fn();
jest.mock('../../../../../selectors/preferencesController', () => ({
  ...jest.requireActual('../../../../../selectors/preferencesController'),
  selectTokenSortConfig: () => mockSelectTokenSortConfig(),
  selectPrivacyMode: () => mockSelectPrivacyMode(),
}));

const mockSelectEnabledNetworks = jest.fn();
jest.mock('../../../../../selectors/networkEnablementController', () => ({
  ...jest.requireActual('../../../../../selectors/networkEnablementController'),
  selectEnabledNetworksByNamespace: () => mockSelectEnabledNetworks(),
}));

const mockTrackEvent = jest.fn();
jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => {
  const { AnalyticsEventBuilder: MockAnalyticsEventBuilder } =
    jest.requireActual('../../../../../util/analytics/AnalyticsEventBuilder');
  return {
    useAnalytics: () => ({
      trackEvent: mockTrackEvent,
      createEventBuilder: MockAnalyticsEventBuilder.createEventBuilder,
    }),
  };
});

jest.mock('../../../DeFiPositions/DeFiPositionsControlBar', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="control-bar" />,
  };
});

jest.mock('../../../DefiEmptyState', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    DefiEmptyState: () => <View testID="defi-empty-state" />,
  };
});

jest.mock('./DeFiPositionsListItemV2', () => ({
  __esModule: true,
  default: ({
    position,
    privacyMode,
  }: {
    position: DeFiProtocolPositionGroup;
    privacyMode: boolean;
  }) => {
    const { Text: RNText } = jest.requireActual('react-native');
    return (
      <RNText testID="list-item">{`${position.protocolId}|${position.marketValue}|${String(
        privacyMode,
      )}`}</RNText>
    );
  },
}));

const mockInitialState = { engine: { backgroundState } };

const makePosition = (
  overrides: Partial<DeFiProtocolPositionGroup>,
): DeFiProtocolPositionGroup => ({
  protocolId: 'Aave V3',
  productName: 'Aave V3',
  protocolIconUrl: 'https://example.com/aave.png',
  chainId: 'eip155:1',
  marketValue: 100,
  iconGroup: [],
  sections: [],
  ...overrides,
});

const makeHookResult = (
  overrides: Partial<UseDeFiPositionsV2Result> = {},
): UseDeFiPositionsV2Result => ({
  positions: [],
  isLoading: false,
  isError: false,
  hasFetched: true,
  refresh: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const renderComponent = (isFullView = true) =>
  renderWithProvider(<DeFiPositionsListV2 isFullView={isFullView} />, {
    state: mockInitialState,
  });

describe('DeFiPositionsListV2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectTokenSortConfig.mockReturnValue({
      key: 'tokenFiatAmount',
      order: 'dsc',
    });
    mockSelectPrivacyMode.mockReturnValue(false);
    mockSelectEnabledNetworks.mockReturnValue({ eip155: { '0x1': true } });
    mockUseDeFiPositionsV2.mockReturnValue(makeHookResult());
  });

  it('fetches immediately (isVisible) since the full view is the viewport', () => {
    renderComponent();

    expect(mockUseDeFiPositionsV2).toHaveBeenCalledWith({
      enabled: true,
      isVisible: true,
    });
  });

  it('renders the loading message when loading', () => {
    mockUseDeFiPositionsV2.mockReturnValue(makeHookResult({ isLoading: true }));

    const { getByText, queryByTestId } = renderComponent();

    expect(
      getByText(strings('defi_positions.loading_positions')),
    ).toBeOnTheScreen();
    expect(queryByTestId('control-bar')).toBeNull();
  });

  it('renders the error messages when in error state', () => {
    mockUseDeFiPositionsV2.mockReturnValue(makeHookResult({ isError: true }));

    const { getByText } = renderComponent();

    expect(
      getByText(strings('defi_positions.error_cannot_load_page')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('defi_positions.error_visit_again')),
    ).toBeOnTheScreen();
  });

  it('renders the control bar and list items when ready with items', () => {
    mockSelectPrivacyMode.mockReturnValue(true);
    mockUseDeFiPositionsV2.mockReturnValue(
      makeHookResult({
        positions: [makePosition({ protocolId: 'Aave V3', marketValue: 100 })],
      }),
    );

    const { getByTestId, getAllByTestId } = renderComponent();

    expect(getByTestId('control-bar')).toBeOnTheScreen();
    expect(
      getByTestId(WalletViewSelectorsIDs.DEFI_POSITIONS_LIST),
    ).toBeOnTheScreen();
    const items = getAllByTestId('list-item');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('Aave V3|100|true');
  });

  it('renders the empty state when ready with no items', () => {
    const { getByTestId, queryByTestId } = renderComponent();

    expect(getByTestId('defi-empty-state')).toBeOnTheScreen();
    expect(
      queryByTestId(WalletViewSelectorsIDs.DEFI_POSITIONS_LIST),
    ).toBeNull();
  });

  it('filters out positions on disabled EVM networks', () => {
    mockSelectEnabledNetworks.mockReturnValue({ eip155: { '0x1': true } });
    mockUseDeFiPositionsV2.mockReturnValue(
      makeHookResult({
        positions: [
          makePosition({ protocolId: 'OnMainnet', chainId: 'eip155:1' }),
          makePosition({ protocolId: 'OnPolygon', chainId: 'eip155:137' }),
        ],
      }),
    );

    const { getAllByTestId } = renderComponent();

    const items = getAllByTestId('list-item');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('OnMainnet|100|false');
  });

  it('keeps non-EVM positions regardless of the enabled EVM networks', () => {
    mockSelectEnabledNetworks.mockReturnValue({ eip155: { '0x1': true } });
    mockUseDeFiPositionsV2.mockReturnValue(
      makeHookResult({
        positions: [
          makePosition({
            protocolId: 'Solana',
            chainId:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as DeFiProtocolPositionGroup['chainId'],
          }),
        ],
      }),
    );

    const { getAllByTestId } = renderComponent();

    expect(getAllByTestId('list-item')[0]).toHaveTextContent(
      'Solana|100|false',
    );
  });

  it('sorts by fiat value descending', () => {
    mockSelectTokenSortConfig.mockReturnValue({
      key: 'tokenFiatAmount',
      order: 'dsc',
    });
    mockUseDeFiPositionsV2.mockReturnValue(
      makeHookResult({
        positions: [
          makePosition({ protocolId: 'Low', marketValue: 10 }),
          makePosition({ protocolId: 'High', marketValue: 900 }),
        ],
      }),
    );

    const { getAllByTestId } = renderComponent();

    const items = getAllByTestId('list-item').map((n) => n.props.children);
    expect(items[0]).toContain('High');
    expect(items[1]).toContain('Low');
  });

  it('sorts by fiat value ascending', () => {
    mockSelectTokenSortConfig.mockReturnValue({
      key: 'tokenFiatAmount',
      order: 'asc',
    });
    mockUseDeFiPositionsV2.mockReturnValue(
      makeHookResult({
        positions: [
          makePosition({ protocolId: 'High', marketValue: 900 }),
          makePosition({ protocolId: 'Low', marketValue: 10 }),
        ],
      }),
    );

    const { getAllByTestId } = renderComponent();

    const items = getAllByTestId('list-item').map((n) => n.props.children);
    expect(items[0]).toContain('Low');
    expect(items[1]).toContain('High');
  });

  it('sorts by protocol name when not sorting by fiat value', () => {
    mockSelectTokenSortConfig.mockReturnValue({ key: 'name', order: 'asc' });
    mockUseDeFiPositionsV2.mockReturnValue(
      makeHookResult({
        positions: [
          makePosition({ protocolId: 'Zebra', marketValue: 900 }),
          makePosition({ protocolId: 'Alpha', marketValue: 10 }),
        ],
      }),
    );

    const { getAllByTestId } = renderComponent();

    const items = getAllByTestId('list-item').map((n) => n.props.children);
    expect(items[0]).toContain('Alpha');
    expect(items[1]).toContain('Zebra');
  });

  it('renders a scroll view with pull-to-refresh in full view', () => {
    mockUseDeFiPositionsV2.mockReturnValue(
      makeHookResult({
        positions: [makePosition({})],
      }),
    );

    const { getByTestId } = renderComponent(true);

    expect(
      getByTestId(WalletViewSelectorsIDs.DEFI_POSITIONS_SCROLL_VIEW),
    ).toBeOnTheScreen();
  });

  it('calls refresh when pulled to refresh in full view', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockUseDeFiPositionsV2.mockReturnValue(
      makeHookResult({
        positions: [makePosition({})],
        refresh,
      }),
    );

    const { getByTestId } = renderComponent(true);

    const scrollView = getByTestId(
      WalletViewSelectorsIDs.DEFI_POSITIONS_SCROLL_VIEW,
    );
    await act(async () => {
      await scrollView.props.refreshControl.props.onRefresh();
    });

    expect(refresh).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(
        getByTestId(WalletViewSelectorsIDs.DEFI_POSITIONS_SCROLL_VIEW).props
          .refreshControl.props.refreshing,
      ).toBe(false),
    );
  });

  it('tracks the position screen viewed event once when ready in full view', () => {
    mockUseDeFiPositionsV2.mockReturnValue(
      makeHookResult({
        positions: [
          makePosition({ protocolId: 'A' }),
          makePosition({ protocolId: 'B' }),
          makePosition({ protocolId: 'C' }),
        ],
      }),
    );

    renderComponent(true);

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.POSITION_SCREEN_VIEWED,
      )
        .addProperties({
          item_count: 3,
          location: 'homepage',
          is_empty: false,
          screen_type: 'defi',
        })
        .build(),
    );
  });

  it('reports is_empty when ready with no items', () => {
    renderComponent(true);

    expect(mockTrackEvent).toHaveBeenCalledWith(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.POSITION_SCREEN_VIEWED,
      )
        .addProperties({
          item_count: 0,
          location: 'homepage',
          is_empty: true,
          screen_type: 'defi',
        })
        .build(),
    );
  });

  it('does not track the screen viewed event when not in full view', () => {
    mockUseDeFiPositionsV2.mockReturnValue(
      makeHookResult({
        positions: [makePosition({}), makePosition({ protocolId: 'B' })],
      }),
    );

    renderComponent(false);

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('does not track the screen viewed event while loading', () => {
    mockUseDeFiPositionsV2.mockReturnValue(makeHookResult({ isLoading: true }));

    renderComponent(true);

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});
