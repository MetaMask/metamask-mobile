import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import type { CaipChainId } from '@metamask/utils';
import type { NetworkListProps } from '../Bridge/components/BridgeTokenSelector/NetworkListModal';
import QuickBuyNetworkListScreen from './QuickBuyNetworkListScreen';
import { QuickBuySheetSelectorsIDs } from './QuickBuySheet.testIds';
import { useQuickBuyContext } from './useQuickBuyContext';

const POLYGON = 'eip155:137' as CaipChainId;
const mockChainRanking = [
  { chainId: 'eip155:1' as CaipChainId, name: 'Ethereum' },
  { chainId: POLYGON, name: 'Polygon' },
];
let mockSelectedChainId: CaipChainId | undefined;
const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../../core/redux/slices/bridge', () => ({
  selectAllowedChainRanking: () => mockChainRanking,
  selectTokenSelectorNetworkFilter: () => mockSelectedChainId,
  setTokenSelectorNetworkFilter: (payload?: CaipChainId) => ({
    type: 'bridge/setTokenSelectorNetworkFilter',
    payload,
  }),
}));

jest.mock('./useQuickBuyContext', () => ({
  useQuickBuyContext: jest.fn(),
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockNetworkListProps = jest.fn();
jest.mock('../Bridge/components/BridgeTokenSelector/NetworkListModal', () => ({
  NetworkList: (props: unknown) => {
    mockNetworkListProps(props);
    return null;
  },
}));

const getNetworkListProps = (): NetworkListProps =>
  mockNetworkListProps.mock.calls.at(-1)?.[0];

describe('QuickBuyNetworkListScreen', () => {
  const setActiveScreen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedChainId = POLYGON;
    (useQuickBuyContext as jest.Mock).mockReturnValue({ setActiveScreen });
  });

  it('renders the network list header with its own test IDs', () => {
    render(<QuickBuyNetworkListScreen />);

    expect(
      screen.getByTestId(QuickBuySheetSelectorsIDs.NETWORK_LIST_HEADER),
    ).toBeOnTheScreen();
    expect(screen.getByText('bridge.select_network')).toBeOnTheScreen();
  });

  it('shows the allowed chains with the current filter selected', () => {
    render(<QuickBuyNetworkListScreen />);

    expect(getNetworkListProps().chainRanking).toBe(mockChainRanking);
    expect(getNetworkListProps().selectedChainId).toBe(POLYGON);
  });

  it('sets the filter and returns to the picker when a network is selected', () => {
    render(<QuickBuyNetworkListScreen />);

    getNetworkListProps().onSelect('eip155:1' as CaipChainId);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'bridge/setTokenSelectorNetworkFilter',
      payload: 'eip155:1',
    });
    expect(setActiveScreen).toHaveBeenCalledWith('payWith');
  });

  it('clears the filter when All networks is selected', () => {
    render(<QuickBuyNetworkListScreen />);

    getNetworkListProps().onSelect(undefined);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'bridge/setTokenSelectorNetworkFilter',
      payload: undefined,
    });
  });

  it('returns to the picker without changing the filter on back', () => {
    render(<QuickBuyNetworkListScreen />);

    fireEvent.press(
      screen.getByTestId(QuickBuySheetSelectorsIDs.NETWORK_LIST_BACK),
    );

    expect(setActiveScreen).toHaveBeenCalledWith('payWith');
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
