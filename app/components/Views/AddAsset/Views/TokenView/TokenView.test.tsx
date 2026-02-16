import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import TokenView from './TokenView';
import { Hex } from '@metamask/utils';
import {
  MultichainNetworkConfiguration,
  SupportedCaipChainId,
} from '@metamask/multichain-network-controller';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('../../../../../core/Multichain/utils', () => ({
  isNonEvmChainId: (chainId: string) => chainId.startsWith('solana:'),
}));

jest.mock('../../../../../util/networks', () => ({
  ...jest.requireActual('../../../../../util/networks'),
  getNetworkImageSource: jest.fn(() => ({ uri: 'mock' })),
}));

const mockUseSearchRequest = jest.fn();
jest.mock(
  '../../../../UI/Trending/hooks/useSearchRequest/useSearchRequest',
  () => ({
    useSearchRequest: (...args: unknown[]) => mockUseSearchRequest(...args),
  }),
);

jest.mock('@tommasini/react-native-scrollable-tab-view', () => {
  const { View } = jest.requireActual('react-native');
  const MockScrollableTabView = ({
    children,
  }: {
    children: React.ReactNode;
  }) => <View>{children}</View>;
  MockScrollableTabView.displayName = 'ScrollableTabView';
  return {
    __esModule: true,
    default: MockScrollableTabView,
  };
});

jest.mock(
  '../../components/SearchTokenAutoComplete/SearchTokenAutocomplete',
  () => {
    const { View } = jest.requireActual('react-native');
    return ({ tabLabel }: { tabLabel: string }) => (
      <View testID="search-token-autocomplete" accessibilityLabel={tabLabel} />
    );
  },
);

jest.mock('../../components/AddCustomToken/AddCustomToken', () => {
  const { View } = jest.requireActual('react-native');
  return ({ tabLabel }: { tabLabel: string }) => (
    <View testID="add-custom-token" accessibilityLabel={tabLabel} />
  );
});

const mockNetworkConfigurations = {
  '0x1': {
    chainId: '0x1' as Hex,
    name: 'Ethereum Mainnet',
    nativeCurrency: 'ETH',
    isEvm: true,
    rpcEndpoints: [{ networkClientId: 'mainnet' }],
  },
} as unknown as Record<string, MultichainNetworkConfiguration>;

const mockInitialState = {
  settings: {},
  engine: { backgroundState: { ...backgroundState } },
};

const defaultProps = {
  selectedNetwork: '0x1' as Hex,
  openNetworkSelector: jest.fn(),
  networkConfigurations: mockNetworkConfigurations,
};

const renderComponent = (
  overrides: Partial<
    Omit<typeof defaultProps, 'selectedNetwork'> & {
      selectedNetwork: SupportedCaipChainId | Hex | null;
    }
  > = {},
) =>
  renderWithProvider(<TokenView {...defaultProps} {...overrides} />, {
    state: mockInitialState,
  });

describe('TokenView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSearchRequest.mockReturnValue({
      error: null,
      isLoading: false,
      results: [],
      search: jest.fn(),
    });
  });

  it('shows loading indicator while search support is being probed', () => {
    mockUseSearchRequest.mockReturnValue({
      error: null,
      isLoading: true,
      results: [],
      search: jest.fn(),
    });

    const { getByTestId, queryByTestId } = renderComponent();

    expect(getByTestId('add-asset-loading-indicator')).toBeOnTheScreen();
    expect(queryByTestId('add-asset-tabs-container')).toBeNull();
  });

  it('shows both tabs for EVM chain when search is supported', () => {
    const { getByTestId, queryByTestId } = renderComponent();

    expect(queryByTestId('add-asset-loading-indicator')).toBeNull();
    expect(getByTestId('add-asset-tabs-container')).toBeOnTheScreen();
    expect(getByTestId('search-token-autocomplete')).toBeOnTheScreen();
    expect(getByTestId('add-custom-token')).toBeOnTheScreen();
  });

  it('shows only custom token tab for EVM chain when search probe fails', () => {
    mockUseSearchRequest.mockReturnValue({
      error: new Error('Bad request'),
      isLoading: false,
      results: [],
      search: jest.fn(),
    });

    const { getByTestId, queryByTestId } = renderComponent();

    expect(queryByTestId('search-token-autocomplete')).toBeNull();
    expect(getByTestId('add-custom-token')).toBeOnTheScreen();
  });

  it('shows only search tab for non-EVM chains', () => {
    const { getByTestId, queryByTestId } = renderComponent({
      selectedNetwork: 'solana:mainnet' as unknown as Hex,
    });

    expect(getByTestId('search-token-autocomplete')).toBeOnTheScreen();
    expect(queryByTestId('add-custom-token')).toBeNull();
  });

  it('shows no tabs when no network is selected', () => {
    const { queryByTestId } = renderComponent({ selectedNetwork: null });

    expect(queryByTestId('search-token-autocomplete')).toBeNull();
    expect(queryByTestId('add-custom-token')).toBeNull();
  });
});
