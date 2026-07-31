import React from 'react';
import type { DeFiProtocolPositionGroup } from '@metamask/assets-controllers';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import DeFiPositionsListV2 from './DeFiPositionsListV2';
import type { DeFiPositionsListState } from './DeFiPositionsListView';
import type { UseDeFiPositionsV2Result } from '../hooks/useDeFiPositionsV2';

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

// Capture what the container maps its data onto and render it minimally.
let mockLastViewProps: {
  state: DeFiPositionsListState;
  isFullView: boolean;
  refreshing: boolean;
  onRefresh: () => void;
} | null = null;
jest.mock('./DeFiPositionsListView', () => ({
  __esModule: true,
  default: (props: {
    state: DeFiPositionsListState;
    isFullView: boolean;
    refreshing: boolean;
    onRefresh: () => void;
  }) => {
    const {
      View,
      Text: RNText,
      TouchableOpacity: RNTouchable,
    } = jest.requireActual('react-native');
    mockLastViewProps = props;
    return (
      <View>
        <RNText testID="status">{props.state.status}</RNText>
        <RNText testID="refreshing">{String(props.refreshing)}</RNText>
        {props.state.status === 'ready' ? props.state.items : null}
        <RNTouchable testID="refresh-btn" onPress={props.onRefresh}>
          <RNText>refresh</RNText>
        </RNTouchable>
      </View>
    );
  },
}));

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
    mockLastViewProps = null;
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

  it('maps loading to the loading state', () => {
    mockUseDeFiPositionsV2.mockReturnValue(makeHookResult({ isLoading: true }));

    const { getByTestId } = renderComponent();

    expect(getByTestId('status')).toHaveTextContent('loading');
  });

  it('maps error to the error state', () => {
    mockUseDeFiPositionsV2.mockReturnValue(makeHookResult({ isError: true }));

    const { getByTestId } = renderComponent();

    expect(getByTestId('status')).toHaveTextContent('error');
  });

  it('renders one list item per position and forwards privacy mode', () => {
    mockSelectPrivacyMode.mockReturnValue(true);
    mockUseDeFiPositionsV2.mockReturnValue(
      makeHookResult({
        positions: [makePosition({ protocolId: 'Aave V3', marketValue: 100 })],
      }),
    );

    const { getAllByTestId } = renderComponent();

    const items = getAllByTestId('list-item');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('Aave V3|100|true');
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
    expect(items[0]).toHaveTextContent('OnMainnet');
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

    expect(getAllByTestId('list-item')[0]).toHaveTextContent('Solana');
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

  it('forwards isFullView to the view', () => {
    renderComponent(false);

    expect(mockLastViewProps?.isFullView).toBe(false);
  });

  it('calls refresh and toggles refreshing when pulled to refresh', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockUseDeFiPositionsV2.mockReturnValue(makeHookResult({ refresh }));

    const { getByTestId } = renderComponent();

    expect(getByTestId('refreshing')).toHaveTextContent('false');

    fireEvent.press(getByTestId('refresh-btn'));

    expect(refresh).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(getByTestId('refreshing')).toHaveTextContent('false'),
    );
  });
});
