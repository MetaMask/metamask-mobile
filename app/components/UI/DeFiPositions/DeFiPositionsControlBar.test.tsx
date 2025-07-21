import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import DeFiPositionsControlBar from './DeFiPositionsControlBar';
import { strings } from '../../../../locales/i18n';
import { CHAIN_IDS } from '@metamask/transaction-controller';

jest.mock('../../../util/networks', () => ({
  ...jest.requireActual('../../../util/networks'),
  isRemoveGlobalNetworkSelectorEnabled: jest.fn().mockReturnValue(false),
  isTestNet: jest.fn().mockReturnValue(false),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

jest.mock('../../../selectors/networkController', () => ({
  selectIsAllNetworks: () => false,
  selectIsPopularNetwork: () => true,
  selectChainId: () => '0x1',
}));

jest.mock('../../../selectors/networkInfos', () => ({
  selectNetworkName: () => 'Ethereum Mainnet',
}));

jest.mock('../../hooks/useCurrentNetworkInfo', () => ({
  useCurrentNetworkInfo: () => ({
    enabledNetworks: ['0x1', '0x89'],
    getNetworkInfo: jest.fn().mockReturnValue({
      networkName: 'Ethereum Mainnet',
    }),
  }),
}));

jest.mock('../../hooks/useStyles', () => ({
  useStyles: () => ({
    styles: {
      actionBarWrapper: {},
      controlButton: {},
      controlButtonDisabled: {},
      controlButtonText: {},
      controlIconButton: {},
    },
  }),
}));

jest.mock('../Tokens/TokensBottomSheet', () => ({
  createTokenBottomSheetFilterNavDetails: () => [
    'RootModalFlow',
    { screen: 'TokenFilter' },
  ],
  createTokensBottomSheetNavDetails: () => [
    'RootModalFlow',
    { screen: 'TokensBottomSheet' },
  ],
}));

jest.mock('../NetworkManager', () => ({
  createNetworkManagerNavDetails: () => [
    'RootModalFlow',
    { screen: 'NetworkManager' },
  ],
}));

const mockStore = configureMockStore();

describe('DeFiPositionsControlBar', () => {
  let store: ReturnType<typeof mockStore>;

  const createMockState = (overrides = {}) => ({
    engine: {
      backgroundState: {
        NetworkController: {
          provider: {
            chainId: CHAIN_IDS.MAINNET,
            type: 'mainnet',
          },
          networkConfigurations: {
            '0x1': {
              chainId: '0x1',
              nickname: 'Ethereum Mainnet',
              rpcUrl: 'https://mainnet.infura.io/v3/',
              ticker: 'ETH',
            },
            '0x89': {
              chainId: '0x89',
              nickname: 'Polygon',
              rpcUrl: 'https://polygon-rpc.com',
              ticker: 'MATIC',
            },
          },
        },
        PreferencesController: {
          selectedAddress: '0x123',
        },
      },
    },
    ...overrides,
  });

  beforeEach(() => {
    store = mockStore(createMockState());
    jest.clearAllMocks();
  });

  it('should render correctly with default state', () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <DeFiPositionsControlBar />
      </Provider>,
    );

    expect(getByTestId('defi-positions-network-filter')).toBeDefined();
  });

  it('should show current network name when isRemoveGlobalNetworkSelectorEnabled is false and single network', () => {
    const mockState = createMockState({
      engine: {
        backgroundState: {
          NetworkController: {
            provider: {
              chainId: CHAIN_IDS.MAINNET,
              type: 'mainnet',
            },
          },
          PreferencesController: {
            selectedAddress: '0x123',
          },
        },
      },
    });

    store = mockStore(mockState);

    const { getByText } = render(
      <Provider store={store}>
        <DeFiPositionsControlBar />
      </Provider>,
    );

    expect(getByText('Ethereum Mainnet')).toBeDefined();
  });

  it('should show popular networks text when isRemoveGlobalNetworkSelectorEnabled is false and isAllNetworks is true', () => {
    const mockState = createMockState();
    store = mockStore(mockState);

    const networkControllerModule = jest.requireMock(
      '../../../selectors/networkController',
    );
    networkControllerModule.selectIsAllNetworks = () => true;
    networkControllerModule.selectIsPopularNetwork = () => true;

    const { getByText } = render(
      <Provider store={store}>
        <DeFiPositionsControlBar />
      </Provider>,
    );

    expect(getByText(strings('wallet.popular_networks'))).toBeDefined();
  });

  it('should show enabled networks text when isRemoveGlobalNetworkSelectorEnabled is true and multiple networks enabled', () => {
    const networksModule = jest.requireMock('../../../util/networks');
    networksModule.isRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);

    const mockState = createMockState();
    store = mockStore(mockState);

    const { getByText } = render(
      <Provider store={store}>
        <DeFiPositionsControlBar />
      </Provider>,
    );

    expect(getByText(strings('networks.enabled_networks'))).toBeDefined();
  });

  it('should show current network name when isRemoveGlobalNetworkSelectorEnabled is true and single network enabled', () => {
    const networksModule = jest.requireMock('../../../util/networks');
    networksModule.isRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);

    const useCurrentNetworkInfoModule = jest.requireMock(
      '../../hooks/useCurrentNetworkInfo',
    );
    useCurrentNetworkInfoModule.useCurrentNetworkInfo = () => ({
      enabledNetworks: ['0x1'],
      getNetworkInfo: jest.fn().mockReturnValue({
        networkName: 'Ethereum Mainnet',
      }),
    });

    const mockState = createMockState();
    store = mockStore(mockState);

    const { getByText } = render(
      <Provider store={store}>
        <DeFiPositionsControlBar />
      </Provider>,
    );

    expect(getByText('Ethereum Mainnet')).toBeDefined();
  });

  it('should show current network fallback when isRemoveGlobalNetworkSelectorEnabled is true and no network name', () => {
    const networksModule = jest.requireMock('../../../util/networks');
    networksModule.isRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);

    const useCurrentNetworkInfoModule = jest.requireMock(
      '../../hooks/useCurrentNetworkInfo',
    );
    useCurrentNetworkInfoModule.useCurrentNetworkInfo = () => ({
      enabledNetworks: ['0x1'],
      getNetworkInfo: jest.fn().mockReturnValue(null),
    });

    const mockState = createMockState();
    store = mockStore(mockState);

    const { getByText } = render(
      <Provider store={store}>
        <DeFiPositionsControlBar />
      </Provider>,
    );

    expect(getByText(strings('wallet.current_network'))).toBeDefined();
  });

  it('should navigate to network manager when isRemoveGlobalNetworkSelectorEnabled is true and filter button is pressed', () => {
    const networksModule = jest.requireMock('../../../util/networks');
    networksModule.isRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);

    const mockNavigation = {
      navigate: jest.fn(),
    };

    const navigationModule = jest.requireMock('@react-navigation/native');
    navigationModule.useNavigation = () => mockNavigation;

    const mockState = createMockState();
    store = mockStore(mockState);

    const { getByTestId } = render(
      <Provider store={store}>
        <DeFiPositionsControlBar />
      </Provider>,
    );

    const filterButton = getByTestId('defi-positions-network-filter');
    fireEvent.press(filterButton);

    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      'RootModalFlow',
      expect.objectContaining({
        screen: 'NetworkManager',
      }),
    );
  });

  it('should navigate to token filter when isRemoveGlobalNetworkSelectorEnabled is false and filter button is pressed', () => {
    const networksModule = jest.requireMock('../../../util/networks');
    networksModule.isRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);

    const mockNavigation = {
      navigate: jest.fn(),
    };

    const navigationModule = jest.requireMock('@react-navigation/native');
    navigationModule.useNavigation = () => mockNavigation;

    const mockState = createMockState();
    store = mockStore(mockState);

    const { getByTestId } = render(
      <Provider store={store}>
        <DeFiPositionsControlBar />
      </Provider>,
    );

    const filterButton = getByTestId('defi-positions-network-filter');
    fireEvent.press(filterButton);

    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      'RootModalFlow',
      expect.objectContaining({
        screen: 'TokenFilter',
      }),
    );
  });

  it('should be disabled when on testnet', () => {
    const networksModule = jest.requireMock('../../../util/networks');
    networksModule.isTestNet.mockReturnValue(true);

    const mockState = createMockState({
      engine: {
        backgroundState: {
          NetworkController: {
            provider: {
              chainId: CHAIN_IDS.GOERLI,
              type: 'goerli',
            },
          },
          PreferencesController: {
            selectedAddress: '0x123',
          },
        },
      },
    });

    store = mockStore(mockState);

    const { getByTestId } = render(
      <Provider store={store}>
        <DeFiPositionsControlBar />
      </Provider>,
    );

    const filterButton = getByTestId('defi-positions-network-filter');
    expect(filterButton.props.disabled).toBe(true);
  });

  it('should be disabled when not on popular network', () => {
    const networkControllerModule = jest.requireMock(
      '../../../selectors/networkController',
    );
    networkControllerModule.selectIsPopularNetwork = () => false;

    const mockState = createMockState();
    store = mockStore(mockState);

    const { getByTestId } = render(
      <Provider store={store}>
        <DeFiPositionsControlBar />
      </Provider>,
    );

    const filterButton = getByTestId('defi-positions-network-filter');
    expect(filterButton.props.disabled).toBe(true);
  });

  it('should render sort button with filter icon', () => {
    const mockState = createMockState();
    store = mockStore(mockState);

    const { getByTestId } = render(
      <Provider store={store}>
        <DeFiPositionsControlBar />
      </Provider>,
    );

    expect(getByTestId('defi-positions-network-filter')).toBeDefined();
  });
});
