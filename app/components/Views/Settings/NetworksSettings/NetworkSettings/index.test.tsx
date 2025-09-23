// Mock the Analytics module BEFORE any imports
jest.mock('../../../../../core/Analytics', () => ({
  MetaMetrics: {
    getInstance: jest.fn(() => ({
      addTraitsToUser: jest.fn(),
    })),
  },
  MetaMetricsEvents: {
    NETWORK_REMOVED: 'Network Removed',
  },
}));

import React from 'react';
import { shallow } from 'enzyme';
import { RpcEndpointType } from '@metamask/network-controller';
import { NetworkSettings } from './'; // Import the undecorated component
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { ThemeContext, mockTheme } from '../../../../../../app/util/theme';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { isNetworkUiRedesignEnabled } from '../../../../../util/networks/isNetworkUiRedesignEnabled';
import { mockNetworkState } from '../../../../../util/test/network';
// eslint-disable-next-line import/no-namespace
import * as jsonRequest from '../../../../../util/jsonRpcRequest';
import Logger from '../../../../../util/Logger';
import Engine from '../../../../../core/Engine';
// eslint-disable-next-line import/no-namespace
import * as networks from '../../../../../util/networks';
import { isRemoveGlobalNetworkSelectorEnabled } from '../../../../../util/networks';
const { PreferencesController } = Engine.context;

jest.mock(
  '../../../../../util/metrics/MultichainAPI/networkMetricUtils',
  () => ({
    addItemToChainIdList: jest.fn().mockReturnValue({
      chain_id_list: ['eip155:1'],
    }),
    removeItemFromChainIdList: jest.fn().mockReturnValue({
      chain_id_list: ['eip155:1'],
    }),
  }),
);

jest.mock('../../../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn(() => ({
        build: jest.fn(),
      })),
    })),
  }),
  withMetricsAwareness: (Component: unknown) => Component,
}));

// Mock the entire module
jest.mock('../../../../../util/networks/isNetworkUiRedesignEnabled', () => ({
  isNetworkUiRedesignEnabled: jest.fn(),
}));

// Mock the feature flag
jest.mock('../../../../../util/networks', () => {
  const mockGetAllNetworks = jest.fn(() => ['mainnet', 'sepolia']);
  const mockIsRemoveGlobalNetworkSelectorEnabled = jest.fn();
  const mockIsPortfolioViewEnabled = jest.fn();

  return {
    ...jest.requireActual('../../../../../util/networks'),
    isRemoveGlobalNetworkSelectorEnabled:
      mockIsRemoveGlobalNetworkSelectorEnabled,
    isPortfolioViewEnabled: mockIsPortfolioViewEnabled,
    getAllNetworks: mockGetAllNetworks,
    mainnet: {
      name: 'Ethereum Main Network',
      chainId: '0x1',
      rpcUrl: 'https://mainnet.infura.io/v3',
    },
    sepolia: {
      name: 'Sepolia Test Network',
      chainId: '0xaa36a7',
      rpcUrl: 'https://sepolia.infura.io/v3',
    },
  };
});

jest.useFakeTimers();
const mockStore = configureMockStore();

const initialState = {
  engine: {
    backgroundState,
  },
  networkOnboarded: {
    networkOnboardedState: { '1': true },
  },
  NetworkController: {
    ...mockNetworkState({
      chainId: '0x1',
      id: 'mainnet',
      nickname: 'Ethereum Mainnet',
      ticker: 'ETH',
      blockExplorerUrl: 'https://goerli.lineascan.build',
    }),
  },
};

jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      setProviderType: jest.fn(),
      setActiveNetwork: jest.fn(),
      getNetworkClientById: () => ({
        configuration: {
          chainId: '0x1',
          rpcUrl: 'https://mainnet.infura.io/v3',
          ticker: 'ETH',
          type: 'custom',
        },
      }),
      removeNetwork: jest.fn(),
      updateNetwork: jest.fn(),
      addNetwork: jest.fn(),
    },
    MultichainNetworkController: {
      setActiveNetwork: jest.fn(),
    },
    CurrencyRateController: {
      updateExchangeRate: jest.fn(),
    },
    PreferencesController: {
      setTokenNetworkFilter: jest.fn(),
    },
    NetworkEnablementController: {
      enableNetwork: jest.fn(),
      disableNetwork: jest.fn(),
      enableNetworkInNamespace: jest.fn(),
    },
  },
}));

const store = mockStore(initialState);

const SAMPLE_NETWORKSETTINGS_PROPS = {
  route: { params: {} },
  providerConfig: {
    rpcUrl: 'https://mainnet.infura.io/v3/YOUR-PROJECT-ID',
  },
  networkConfigurations: {
    '0x1': {
      blockExplorerUrls: ['https://etherscan.io'],
      chainId: '0x1',
      defaultRpcEndpointIndex: 0,
      name: 'Ethereum mainnet',
      nativeCurrency: 'ETH',
      rpcEndpoints: [
        {
          networkClientId: 'mainnet',
          type: 'custom',
          url: 'https://mainnet.infura.io/v3/YOUR-PROJECT-ID',
        },
      ],
    },

    '0x5': {
      chainId: '0x5',
      name: 'Goerli',
      rpcEndpoints: [
        {
          networkClientId: 'goerli',
          type: 'custom',
          url: 'https://goerli.infura.io/v3/{infuraProjectId}',
        },
      ],
    },
  },
  networkOnboardedState: { '0x1': true, '0xe708': true },
  navigation: { setOptions: jest.fn(), navigate: jest.fn(), goBack: jest.fn() },
  matchedChainNetwork: {
    safeChainsList: [
      {
        name: 'Ethereum Mainnet',
        chain: 'ETH',
        chainId: 1,
        icon: 'ethereum',
        rpc: [
          'https://mainnet.infura.io/v3/${INFURA_API_KEY}',
          'wss://mainnet.infura.io/ws/v3/${INFURA_API_KEY}',
          'https://api.mycryptoapi.com/eth',
          'https://cloudflare-eth.com',
          'https://ethereum-rpc.publicnode.com',
          'wss://ethereum-rpc.publicnode.com',
          'https://mainnet.gateway.tenderly.co',
          'wss://mainnet.gateway.tenderly.co',
          'https://rpc.blocknative.com/boost',
          'https://rpc.flashbots.net',
          'https://rpc.flashbots.net/fast',
          'https://rpc.mevblocker.io',
          'https://rpc.mevblocker.io/fast',
          'https://rpc.mevblocker.io/noreverts',
          'https://rpc.mevblocker.io/fullprivacy',
          'https://eth.drpc.org',
          'wss://eth.drpc.org',
        ],
        features: [
          {
            name: 'EIP155',
          },
          {
            name: 'EIP1559',
          },
        ],
        faucets: [],
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        infoURL: 'https://ethereum.org',
        shortName: 'eth',
        networkId: 1,
        slip44: 60,
        ens: {
          registry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
        },
        explorers: [
          {
            name: 'etherscan',
            url: 'https://etherscan.io',
            standard: 'EIP3091',
          },
          {
            name: 'blockscout',
            url: 'https://eth.blockscout.com',
            icon: 'blockscout',
            standard: 'EIP3091',
          },
          {
            name: 'dexguru',
            url: 'https://ethereum.dex.guru',
            icon: 'dexguru',
            standard: 'EIP3091',
          },
        ],
      },
      {
        name: 'Polygon',
        chain: 'MATIC',
        chainId: 137,
        faucets: [],
        nativeCurrency: {
          name: 'Polygon',
          symbol: 'MATIC',
          decimals: 18,
        },
      },
    ],
  },
};

describe('NetworkSettings', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let wrapper: any;

  beforeEach(() => {
    jest.clearAllMocks();
    wrapper = shallow(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <NetworkSettings {...SAMPLE_NETWORKSETTINGS_PROPS} />
        </ThemeContext.Provider>
      </Provider>,
    )
      .find(NetworkSettings)
      .dive();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const component = shallow(
      <Provider store={store}>
        <NetworkSettings />
      </Provider>,
    );

    expect(component).toMatchSnapshot();
  });

  it('should render the component correctly when isNetworkUiRedesignEnabled is true', () => {
    (isNetworkUiRedesignEnabled as jest.Mock).mockImplementation(() => true);

    const component = shallow(
      <Provider store={store}>
        <NetworkSettings />
      </Provider>,
    );

    expect(component).toMatchSnapshot();
    expect(isNetworkUiRedesignEnabled()).toBe(true);
  });

  it('should render the component correctly when isNetworkUiRedesignEnabled is false', () => {
    (isNetworkUiRedesignEnabled as jest.Mock).mockImplementation(() => false);

    const component = shallow(
      <Provider store={store}>
        <NetworkSettings />
      </Provider>,
    );

    expect(component).toMatchSnapshot();
    expect(isNetworkUiRedesignEnabled()).toBe(false);
  });

  it('should update state and call getCurrentState on RPC URL change', async () => {
    const SAMPLE_NETWORKSETTINGS_PROPS_2 = {
      route: {
        params: {
          network: 'mainnet',
        },
      },
      navigation: {
        setOptions: jest.fn(),
        navigate: jest.fn(),
        goBack: jest.fn(),
      },
      networkConfigurations: {
        '0x1': {
          blockExplorerUrls: ['https://etherscan.io'],
          defaultBlockExplorerUrlIndex: 0,
          defaultRpcEndpointIndex: 0,
          chainId: '0x1',
          rpcEndpoints: [
            {
              networkClientId: 'mainnet',
              type: 'Infura',
              url: 'https://mainnet.infura.io/v3/',
            },
          ],
          name: 'Ethereum Main Network',
          nativeCurrency: 'ETH',
        },
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapper2: any = shallow(
      <Provider store={store}>
        <NetworkSettings {...SAMPLE_NETWORKSETTINGS_PROPS_2} />
      </Provider>,
    )
      .find(NetworkSettings)
      .dive();

    const getCurrentStateSpy = jest.spyOn(
      wrapper2.instance(),
      'getCurrentState',
    );

    wrapper2.setState({
      chainId: '0x1',
    });

    await wrapper2.instance().onRpcUrlChange('http://localhost:8545');
    expect(wrapper2.state('rpcUrl')).toBe('http://localhost:8545');
    expect(getCurrentStateSpy).toHaveBeenCalled();
  });

  it('should initialize state correctly when networkTypeOrRpcUrl is provided', () => {
    const SAMPLE_NETWORKSETTINGS_PROPS_2 = {
      route: {
        params: {
          network: 'mainnet',
        },
      },
      navigation: {
        setOptions: jest.fn(),
        navigate: jest.fn(),
        goBack: jest.fn(),
      },
      networkConfigurations: {
        '0x1': {
          blockExplorerUrls: ['https://etherscan.io'],
          defaultBlockExplorerUrlIndex: 0,
          defaultRpcEndpointIndex: 0,
          chainId: '0x1',
          rpcEndpoints: [
            {
              networkClientId: 'mainnet',
              type: 'Infura',
              url: 'https://mainnet.infura.io/v3/',
            },
          ],
          name: 'Ethereum Main Network',
          nativeCurrency: 'ETH',
        },
      },
    };

    const wrapper2 = shallow(
      <Provider store={store}>
        <NetworkSettings {...SAMPLE_NETWORKSETTINGS_PROPS_2} />
      </Provider>,
    )
      .find(NetworkSettings)
      .dive();

    const instance = wrapper2.instance() as NetworkSettings;
    instance.componentDidMount();

    expect(wrapper2.state('blockExplorerUrl')).toBe('https://etherscan.io');
    expect(wrapper2.state('nickname')).toBe('Ethereum Main Network');
    expect(wrapper2.state('chainId')).toBe('0x1');
    expect(wrapper2.state('rpcUrl')).toBe('https://mainnet.infura.io/v3/');
  });

  it('should initialize state correctly when networkTypeOrRpcUrl is provided and isCustomMainnet is true', () => {
    const SAMPLE_NETWORKSETTINGS_PROPS_2 = {
      route: {
        params: { network: 'mainnet', isCustomMainnet: true },
      },
      navigation: {
        setOptions: jest.fn(),
        navigate: jest.fn(),
        goBack: jest.fn(),
      },
      networkConfigurations: {
        '0x1': {
          blockExplorerUrls: ['https://etherscan.io'],
          defaultBlockExplorerUrlIndex: 0,
          defaultRpcEndpointIndex: 0,
          chainId: '0x1',
          rpcEndpoints: [
            {
              networkClientId: 'mainnet',
              url: 'https://mainnet.infura.io/v3/YOUR-PROJECT-ID',
              type: RpcEndpointType.Custom,
            },
          ],
          name: 'Ethereum Main Custom',
          nativeCurrency: 'ETH',
        },
      },
    };

    const wrapperComponent = shallow(
      <Provider store={store}>
        <NetworkSettings {...SAMPLE_NETWORKSETTINGS_PROPS_2} />
      </Provider>,
    )
      .find(NetworkSettings)
      .dive();

    const instance = wrapperComponent.instance() as NetworkSettings;
    instance.componentDidMount();

    expect(wrapperComponent.state('blockExplorerUrl')).toBe(
      'https://etherscan.io',
    );
    expect(wrapperComponent.state('nickname')).toBe('Ethereum Main Custom');
    expect(wrapperComponent.state('chainId')).toBe('0x1');
    expect(wrapperComponent.state('rpcUrl')).toBe(
      'https://mainnet.infura.io/v3/YOUR-PROJECT-ID',
    );
  });

  it('should initialize state correctly when networkTypeOrRpcUrl is provided and allNetworks is not found', () => {
    const SAMPLE_NETWORKSETTINGS_PROPS_2 = {
      route: {
        params: { network: 'https://mainnet.infura.io/v3/YOUR-PROJECT-ID' },
      },
      navigation: {
        setOptions: jest.fn(),
        navigate: jest.fn(),
        goBack: jest.fn(),
      },
      networkConfigurations: {
        '0x1': {
          blockExplorerUrls: ['https://etherscan.io'],
          defaultBlockExplorerUrlIndex: 0,
          defaultRpcEndpointIndex: 0,
          chainId: '0x1',
          rpcEndpoints: [
            {
              url: 'https://mainnet.infura.io/v3/YOUR-PROJECT-ID',
              type: RpcEndpointType.Custom,
              name: 'Ethereum mainnet',
            },
          ],
          name: 'Ethereum mainnet',
          nativeCurrency: 'ETH',
        },
      },
    };

    const wrapper2 = shallow(
      <Provider store={store}>
        <NetworkSettings {...SAMPLE_NETWORKSETTINGS_PROPS_2} />
      </Provider>,
    )
      .find(NetworkSettings)
      .dive();

    const instance = wrapper2.instance() as NetworkSettings;
    instance.componentDidMount();

    expect(wrapper2.state('blockExplorerUrl')).toBe('https://etherscan.io');
    expect(wrapper2.state('nickname')).toBe('Ethereum mainnet');
    expect(wrapper2.state('chainId')).toBe('0x1');
    expect(wrapper2.state('rpcUrl')).toBe(
      'https://mainnet.infura.io/v3/YOUR-PROJECT-ID',
    );
  });

  it('should update state and call getCurrentState on nickname change', async () => {
    const getCurrentStateSpy = jest.spyOn(
      wrapper.instance(),
      'getCurrentState',
    );

    await wrapper.instance().onNicknameChange('Localhost');

    expect(wrapper.state('nickname')).toBe('Localhost');
    expect(getCurrentStateSpy).toHaveBeenCalled();
  });

  it('should initialize state correctly on componentDidMount', () => {
    const instance = wrapper.instance();
    instance.componentDidMount();

    expect(wrapper.state('rpcUrl')).toBe(undefined);
    expect(wrapper.state('blockExplorerUrl')).toBe(undefined);
    expect(wrapper.state('nickname')).toBe(undefined);
    expect(wrapper.state('chainId')).toBe(undefined);
    expect(wrapper.state('ticker')).toBe(undefined);
    expect(wrapper.state('editable')).toBe(undefined);
    expect(wrapper.state('addMode')).toBe(true);
    expect(wrapper.state('warningRpcUrl')).toBe(undefined);
    expect(wrapper.state('warningChainId')).toBe(undefined);
    expect(wrapper.state('warningSymbol')).toBe(undefined);
    expect(wrapper.state('validatedRpcURL')).toBe(true);
    expect(wrapper.state('validatedChainId')).toBe(true);
    expect(wrapper.state('validatedSymbol')).toBe(true);
    expect(wrapper.state('initialState')).toBe(undefined);
    expect(wrapper.state('enableAction')).toBe(false);
    expect(wrapper.state('inputWidth')).toEqual({ width: '99%' });
    expect(wrapper.state('showPopularNetworkModal')).toBe(false);
    expect(wrapper.state('popularNetwork')).toEqual({});
    expect(wrapper.state('showWarningModal')).toBe(false);
    expect(wrapper.state('showNetworkDetailsModal')).toBe(false);
    expect(wrapper.state('isNameFieldFocused')).toBe(false);
    expect(wrapper.state('isSymbolFieldFocused')).toBe(false);
    expect(wrapper.state('networkList')).toEqual([]);
  });

  it('should add RPC URL correctly', async () => {
    wrapper.setState({
      rpcUrl: 'http://localhost:8545',
      chainId: '0x1',
      ticker: 'ETH',
      nickname: 'Localhost',
    });

    await wrapper.instance().addRpcUrl();

    expect(wrapper.state('rpcUrl')).toBe('http://localhost:8545');
  });

  it('should validate RPC URL and Chain ID combination', async () => {
    wrapper.setState({ rpcUrl: 'http://localhost:8545', chainId: '0x1' });

    await wrapper.instance().validateRpcAndChainId();

    expect(wrapper.state('validatedRpcURL')).toBe(true);
    expect(wrapper.state('validatedChainId')).toBe(true);
  });

  it('should add RPC URL correctly to POL for polygon', async () => {
    wrapper.setState({ rpcUrl: 'http://localhost:8545', chainId: '0x89' });

    await wrapper.instance().validateRpcAndChainId();

    expect(wrapper.state('validatedRpcURL')).toBe(true);
    expect(wrapper.state('validatedChainId')).toBe(true);
  });

  // here
  it('should update state and call getCurrentState on block explorer URL change', async () => {
    const newProps = {
      ...SAMPLE_NETWORKSETTINGS_PROPS,
      networkConfigurations: {
        '0x1': {
          chainId: '0x1',
          blockExplorerUrls: ['https://etherscan.io'],
          defaultBlockExplorerUrlIndex: 0,
          rpcEndpoints: [
            {
              url: 'https://rinkeby.infura.io/v3/YOUR-PROJECT-ID',
              type: RpcEndpointType.Infura,
            },
          ],
        },
      },
    };

    wrapper = shallow(
      <Provider store={store}>
        <NetworkSettings {...newProps} />
      </Provider>,
    )
      .find(NetworkSettings)
      .dive();

    wrapper.setState({
      chainId: '0x1',
    });

    const getCurrentStateSpy = jest.spyOn(
      wrapper.instance(),
      'getCurrentState',
    );

    await wrapper.instance().onBlockExplorerUrlChange('https://etherscan.io');

    expect(wrapper.state('blockExplorerUrl')).toBe('https://etherscan.io');
    expect(getCurrentStateSpy).toHaveBeenCalled();
  });

  it('should update state and call getCurrentState on ticker change', async () => {
    const getCurrentStateSpy = jest.spyOn(
      wrapper.instance(),
      'getCurrentState',
    );

    await wrapper.instance().onTickerChange('ETH');

    expect(wrapper.state('ticker')).toBe('ETH');
    expect(getCurrentStateSpy).toHaveBeenCalled();
  });

  it('should update state and call getCurrentState on Chain ID change', async () => {
    const getCurrentStateSpy = jest.spyOn(
      wrapper.instance(),
      'getCurrentState',
    );

    await wrapper.instance().onChainIDChange('0x1');

    expect(wrapper.state('chainId')).toBe('0x1');
    expect(getCurrentStateSpy).toHaveBeenCalled();
  });

  it('should update isNameFieldFocused state on name input focus and blur', () => {
    const instance = wrapper.instance();

    instance.onNameFocused();
    expect(wrapper.state('isNameFieldFocused')).toBe(true);

    instance.onNameBlur();
    expect(wrapper.state('isNameFieldFocused')).toBe(false);
  });

  it('should update isSymbolFieldFocused state on symbol input focus and blur', () => {
    const instance = wrapper.instance();

    instance.onSymbolFocused();
    expect(wrapper.state('isSymbolFieldFocused')).toBe(true);

    instance.onSymbolBlur();
    expect(wrapper.state('isSymbolFieldFocused')).toBe(false);
  });

  it('should update isRpcUrlFieldFocused state on RPC URL input focus and blur', () => {
    const instance = wrapper.instance();

    instance.onRpcUrlFocused();
    expect(wrapper.state('isRpcUrlFieldFocused')).toBe(true);

    instance.onRpcUrlBlur();
    expect(wrapper.state('isRpcUrlFieldFocused')).toBe(false);
  });

  it('should update isChainIdFieldFocused state on chain ID input focus and blur', () => {
    const instance = wrapper.instance();

    instance.onChainIdFocused();
    expect(wrapper.state('isChainIdFieldFocused')).toBe(true);

    instance.onChainIdBlur();
    expect(wrapper.state('isChainIdFieldFocused')).toBe(false);
  });
  describe('NetworkSettings additional tests', () => {
    beforeEach(() => {
      wrapper = shallow(
        <Provider store={store}>
          <NetworkSettings {...SAMPLE_NETWORKSETTINGS_PROPS} />
        </Provider>,
      )
        .find(NetworkSettings)
        .dive();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should validate chain ID format and set warning if invalid', async () => {
      const instance = wrapper.instance();

      // Test with an invalid chainId format
      await instance.onChainIDChange('invalidChainId');
      await instance.validateChainId();

      expect(wrapper.state('warningChainId')).toBe(
        "Invalid number. Enter a decimal or '0x'-prefixed hexadecimal number.",
      );
    });

    it('should validate chain ID correctly if valid', async () => {
      const instance = wrapper.instance();

      // Test with a valid chainId
      await instance.onChainIDChange('0x1');
      await instance.validateChainId();

      expect(wrapper.state('warningChainId')).toBe(undefined);
    });

    it('should toggle the modal for RPC form correctly', () => {
      const instance = wrapper.instance();

      instance.openAddRpcForm();
      expect(wrapper.state('showAddRpcForm').isVisible).toBe(true);

      instance.closeAddRpcForm();
      expect(wrapper.state('showAddRpcForm').isVisible).toBe(false);
    });

    it('should toggle the modal for Block Explorer form correctly', () => {
      const instance = wrapper.instance();

      instance.openAddBlockExplorerForm();
      expect(wrapper.state('showAddBlockExplorerForm').isVisible).toBe(true);

      instance.closeAddBlockExplorerRpcForm();
      expect(wrapper.state('showAddBlockExplorerForm').isVisible).toBe(false);
    });

    it('should validate RPC URL and set a warning if the format is invalid', async () => {
      const instance = wrapper.instance();

      // Test with an invalid RPC URL
      await instance.onRpcUrlChange('invalidUrl');
      await instance.validateRpcUrl('invalidUrl');

      expect(wrapper.state('warningRpcUrl')).toBe(
        'URIs require the appropriate HTTPS prefix',
      );
    });

    it('should not set warning for a valid RPC URL', async () => {
      const instance = wrapper.instance();

      // Test with a valid RPC URL
      await instance.onRpcUrlChange(
        'https://mainnet.infura.io/v3/YOUR-PROJECT-ID',
      );
      await instance.validateRpcUrl(
        'https://mainnet.infura.io/v3/YOUR-PROJECT-ID-2',
      );

      expect(wrapper.state('warningRpcUrl')).toBe(undefined);
    });

    it('should set warning for a duplicated RPC URL', async () => {
      const instance = wrapper.instance();

      // Test with a valid RPC URL
      await instance.onRpcUrlChange(
        'https://mainnet.infura.io/v3/YOUR-PROJECT-ID',
      );
      await instance.validateRpcUrl(
        'https://mainnet.infura.io/v3/YOUR-PROJECT-ID',
      );

      expect(wrapper.state('warningRpcUrl')).toBe('Invalid RPC URL');
    });

    it('should set a warning if the RPC URL format is invalid', async () => {
      const instance = wrapper.instance();

      await instance.validateRpcUrl('invalidUrl');
      expect(wrapper.state('warningRpcUrl')).toBe(
        'URIs require the appropriate HTTPS prefix',
      );
    });

    it('should set a warning for a duplicated RPC URL', async () => {
      const instance = wrapper.instance();

      await instance.validateRpcUrl(
        'https://mainnet.infura.io/v3/YOUR-PROJECT-ID',
      );
      expect(wrapper.state('warningRpcUrl')).toBe('Invalid RPC URL');
    });

    it('should set a warning if the RPC URL already exists in networkConfigurations and UI redesign is disabled', async () => {
      (isNetworkUiRedesignEnabled as jest.Mock).mockImplementation(() => false);
      const instance = wrapper.instance();

      await instance.validateRpcUrl(
        'https://mainnet.infura.io/v3/YOUR-PROJECT-ID',
      );
      await instance.validateRpcUrl(
        'https://mainnet.infura.io/v3/YOUR-PROJECT-ID',
      );
      expect(wrapper.state('warningRpcUrl')).toBe('Invalid RPC URL');
      expect(wrapper.state('validatedRpcURL')).toBe(true);
    });

    it('should set a warning if the RPC URL exists and UI redesign is enabled', async () => {
      (isNetworkUiRedesignEnabled as jest.Mock).mockImplementation(() => true);
      const instance = wrapper.instance();

      await instance.validateRpcUrl(
        'https://mainnet.infura.io/v3/YOUR-PROJECT-ID',
      );
      expect(wrapper.state('warningRpcUrl')).toBe('Invalid RPC URL');
      expect(wrapper.state('validatedRpcURL')).toBe(true);
    });

    it('should correctly add RPC URL through modal and update state', async () => {
      const instance = wrapper.instance();

      // Open RPC form modal and add a new RPC URL
      instance.openAddRpcForm();
      await instance.onRpcItemAdd('https://new-rpc-url.com', 'New RPC');

      expect(wrapper.state('rpcUrls').length).toBe(1);
      expect(wrapper.state('rpcUrls')[0].url).toBe('https://new-rpc-url.com');
      expect(wrapper.state('rpcUrls')[0].name).toBe('New RPC');
    });

    it('adds add RPC URL through modal and update state when addMode is true', async () => {
      wrapper.setState({ addMode: true });

      const instance = wrapper.instance();

      await instance.onRpcItemAdd('https://new-rpc-url.com', 'New RPC');

      expect(wrapper.state('rpcUrls').length).toBe(1);
      expect(wrapper.state('rpcUrls')[0].url).toBe('https://new-rpc-url.com');
      expect(wrapper.state('rpcUrls')[0].name).toBe('New RPC');
    });

    it('should correctly add Block Explorer URL through modal and update state', async () => {
      const instance = wrapper.instance();

      // Open Block Explorer form modal and add a new URL
      instance.openAddBlockExplorerForm();
      await instance.onBlockExplorerItemAdd('https://new-blockexplorer.com');

      expect(wrapper.state('blockExplorerUrls').length).toBe(1);
      expect(wrapper.state('blockExplorerUrls')[0]).toBe(
        'https://new-blockexplorer.com',
      );
    });

    it('adds correctly add Block Explorer URL through modal and update state when addMode is true', async () => {
      wrapper.setState({ addMode: true });

      const instance = wrapper.instance();

      // Open Block Explorer form modal and add a new URL
      instance.openAddBlockExplorerForm();
      await instance.onBlockExplorerItemAdd('https://new-blockexplorer.com');

      expect(wrapper.state('blockExplorerUrls').length).toBe(1);
      expect(wrapper.state('blockExplorerUrls')[0]).toBe(
        'https://new-blockexplorer.com',
      );
    });

    it('should not add an empty Block Explorer URL and should return early', async () => {
      const instance = wrapper.instance();

      // Initially, blockExplorerUrls should be empty
      expect(wrapper.state('blockExplorerUrls').length).toBe(0);

      // Open Block Explorer form modal and attempt to add an empty URL
      instance.openAddBlockExplorerForm();
      await instance.onBlockExplorerItemAdd('');

      // Ensure the state is not updated with the empty URL
      expect(wrapper.state('blockExplorerUrls').length).toBe(0);
      expect(wrapper.state('blockExplorerUrl')).toBeUndefined();
    });

    it('should not add an existing Block Explorer URL and should return early', async () => {
      const instance = wrapper.instance();

      // Set initial state with an existing block explorer URL
      await instance.setState({
        blockExplorerUrls: ['https://existing-blockexplorer.com'],
      });

      // Ensure the initial state contains the existing URL
      expect(wrapper.state('blockExplorerUrls').length).toBe(1);
      expect(wrapper.state('blockExplorerUrls')[0]).toBe(
        'https://existing-blockexplorer.com',
      );

      // Attempt to add the same URL again
      await instance.onBlockExplorerItemAdd(
        'https://existing-blockexplorer.com',
      );

      // Ensure the state remains unchanged and no duplicate is added
      expect(wrapper.state('blockExplorerUrls').length).toBe(1);
      expect(wrapper.state('blockExplorerUrls')[0]).toBe(
        'https://existing-blockexplorer.com',
      );
    });

    it('should call validateRpcAndChainId when chainId and rpcUrl are set', async () => {
      const instance = wrapper.instance();
      const validateRpcAndChainIdSpy = jest.spyOn(
        instance,
        'validateRpcAndChainId',
      );

      wrapper.setState({
        rpcUrl: 'http://localhost:8545',
        chainId: '0x1',
      });

      await instance.validateRpcAndChainId();

      expect(validateRpcAndChainIdSpy).toHaveBeenCalled();
    });

    it('should correctly delete an RPC URL and update state', async () => {
      const instance = wrapper.instance();

      // Add and then delete an RPC URL
      await instance.onRpcItemAdd('https://to-delete-url.com', 'RPC to delete');
      expect(wrapper.state('rpcUrls').length).toBe(1);

      await instance.onRpcUrlDelete('https://to-delete-url.com');
      expect(wrapper.state('rpcUrls').length).toBe(0);
    });

    it('should correctly delete a Block Explorer URL and update state', async () => {
      const instance = wrapper.instance();

      // Add and then delete a Block Explorer URL
      await instance.onBlockExplorerItemAdd(
        'https://to-delete-blockexplorer.com',
      );
      expect(wrapper.state('blockExplorerUrls').length).toBe(1);

      await instance.onBlockExplorerUrlDelete(
        'https://to-delete-blockexplorer.com',
      );
      expect(wrapper.state('blockExplorerUrls').length).toBe(0);
    });

    it('should call the navigation method to go back when removeRpcUrl is called', () => {
      const instance = wrapper.instance();
      wrapper.setState({
        rpcUrl: 'https://mainnet.infura.io/v3/YOUR-PROJECT-ID',
      });
      instance.removeRpcUrl();

      expect(SAMPLE_NETWORKSETTINGS_PROPS.navigation.goBack).toHaveBeenCalled();
    });

    it('should disable action button when form is incomplete', async () => {
      const instance = wrapper.instance();

      // Set incomplete form state
      wrapper.setState({
        rpcUrl: '',
        chainId: '',
        nickname: '',
      });

      await instance.addRpcUrl();

      // The action button should be disabled
      expect(wrapper.state('enableAction')).toBe(false);
    });

    it('should enable action button when form is complete', async () => {
      const instance = wrapper.instance();

      // Set complete form state
      wrapper.setState({
        rpcUrls: [
          {
            url: 'http://localhost:8545',
            type: 'custom',
            name: 'test',
          },
        ],
        rpcUrl: 'http://localhost:8545',
        chainId: '0x1',
        nickname: 'Localhost',
        ticker: 'ETH',
      });

      await instance.getCurrentState();

      // The action button should be enabled
      expect(wrapper.state('enableAction')).toBe(true);
    });

    it('should validateChainId and set appropriate error messages for invalid chainId formats', async () => {
      const instance = wrapper.instance();

      // Set an invalid chain ID
      await instance.onChainIDChange('0xinvalid');
      await instance.validateChainId();

      expect(wrapper.state('warningChainId')).toBe(
        'Invalid hexadecimal number.',
      );
    });

    it('should handle valid chainId conversion and updating state correctly', async () => {
      const instance = wrapper.instance();

      await instance.onChainIDChange('0x2');
      await instance.validateChainId();

      expect(wrapper.state('warningChainId')).toBe(undefined);
    });

    it('should call getCurrentState when onNicknameChange is triggered', async () => {
      const instance = wrapper.instance();
      const getCurrentStateSpy = jest.spyOn(instance, 'getCurrentState');

      await instance.onNicknameChange('New Nickname');

      expect(wrapper.state('nickname')).toBe('New Nickname');
      expect(getCurrentStateSpy).toHaveBeenCalled();
    });

    it('should not call getCurrentState', async () => {
      const instance = wrapper.instance();
      const getCurrentStateSpy = jest.spyOn(instance, 'getCurrentState');

      await instance.onBlockExplorerItemAdd('');

      expect(getCurrentStateSpy).not.toHaveBeenCalled();
    });

    it('should set blockExplorerState', async () => {
      const instance = wrapper.instance();
      const getCurrentStateSpy = jest.spyOn(instance, 'getCurrentState');

      await instance.onBlockExplorerItemAdd('https://etherscan.io');

      expect(wrapper.state('blockExplorerUrls').length).toBe(1);
      expect(getCurrentStateSpy).toHaveBeenCalled();
    });

    it('should not validate the symbol if useSafeChainsListValidation is false', async () => {
      const instance = wrapper.instance();

      const validSymbol = 'ETH';

      await instance.validateSymbol(validSymbol);

      expect(instance.state.warningSymbol).toBeUndefined(); // No warning for valid symbol
    });

    it('should not show symbol warning for whitelisted ticker', async () => {
      const instance = wrapper.instance();

      // Set up state with a whitelisted symbol combination
      instance.setState({
        chainId: '0x3e7', // HYPER_EVM chain ID
        ticker: 'HYPE',
      });

      await instance.validateSymbol();

      expect(instance.state.warningSymbol).toBeUndefined(); // No warning for valid symbol
    });

    it('should validateChainIdOnSubmit', async () => {
      const instance = wrapper.instance();

      const validChainId = '0x38';

      await instance.validateChainIdOnSubmit(
        validChainId,
        validChainId,
        'https://bsc-dataseed.binance.org/',
      );

      expect(instance.state.warningChainId).toBeUndefined();
    });

    it('should set a warning when chainId is not valid', async () => {
      const instance = wrapper.instance();

      const validChainId = '0xInvalidChainId';

      await instance.validateChainIdOnSubmit(validChainId);

      expect(instance.state.warningChainId).toBe(
        'Could not fetch chain ID. Is your RPC URL correct?',
      );
    });

    it('should return without updating warningName when useSafeChainsListValidation is false', () => {
      const instance = wrapper.instance();

      instance.props.useSafeChainsListValidation = false; // Disable validation

      instance.validateName();

      // Make sure warningName wasn't updated
      expect(instance.state.warningName).toBeUndefined();
    });

    it('should set warningName to undefined if chainToMatch name is the same as nickname', () => {
      const instance = wrapper.instance();

      const chainToMatch = { name: 'Test Network' };

      instance.validateName(chainToMatch);

      expect(instance.state.warningName).toBeUndefined();
    });

    it('should set warningName to undefined when networkList name is the same as nickname', () => {
      const instance = wrapper.instance();

      instance.setState({
        networkList: {
          name: 'Test Network', // same as nickname
        },
      });

      instance.validateName();

      expect(instance.state.warningName).toBeUndefined();
    });

    it('should update rpcUrl, set validatedRpcURL to false, and call validation methods', async () => {
      const instance = wrapper.instance();

      const validateNameSpy = jest.spyOn(instance, 'validateName');
      const validateChainIdSpy = jest.spyOn(instance, 'validateChainId');
      const validateSymbolSpy = jest.spyOn(instance, 'validateSymbol');
      const getCurrentStateSpy = jest.spyOn(instance, 'getCurrentState');

      // Mock initial state
      instance.setState({
        addMode: true,
      });

      // Call the function
      await instance.onRpcUrlChangeWithName(
        'https://example.com',
        undefined,
        'Test Network',
        'Custom',
      );

      // Assert that state was updated
      expect(wrapper.state('rpcUrl')).toBe('https://example.com');
      expect(wrapper.state('validatedRpcURL')).toBe(false);
      expect(wrapper.state('rpcName')).toBe('Test Network');
      expect(wrapper.state('warningRpcUrl')).toBeUndefined();
      expect(wrapper.state('warningChainId')).toBeUndefined();
      expect(wrapper.state('warningSymbol')).toBeUndefined();
      expect(wrapper.state('warningName')).toBeUndefined();

      // Assert that the validation methods were called
      expect(validateNameSpy).toHaveBeenCalled();
      expect(validateChainIdSpy).toHaveBeenCalled();
      expect(validateSymbolSpy).toHaveBeenCalled();
      expect(getCurrentStateSpy).toHaveBeenCalled();
    });

    it('should set rpcName to type if name is not provided', async () => {
      const instance = wrapper.instance();

      await instance.onRpcUrlChangeWithName(
        'https://example.com',
        undefined,
        null,
        'Custom',
      );

      expect(wrapper.state('rpcName')).toBe('Custom');
    });

    it('should not call validateChainId if addMode is false', async () => {
      const instance = wrapper.instance();

      const validateChainIdSpy = jest.spyOn(instance, 'validateChainId');

      // Set addMode to false
      instance.setState({
        addMode: false,
      });

      await instance.onRpcUrlChangeWithName(
        'https://example.com',
        undefined,
        'Test Network',
        'Custom',
      );

      // ValidateChainId should not be called
      expect(validateChainIdSpy).not.toHaveBeenCalled();
    });
  });

  describe('NetworkSettings componentDidMount', () => {
    it('should correctly initialize state when networkTypeOrRpcUrl is provided', () => {
      const SAMPLE_NETWORKSETTINGS_PROPS_2 = {
        route: {
          params: {
            network: 'mainnet',
          },
        },
        navigation: {
          setOptions: jest.fn(),
          navigate: jest.fn(),
          goBack: jest.fn(),
        },
        networkConfigurations: {
          '0x1': {
            blockExplorerUrls: ['https://etherscan.io'],
            defaultBlockExplorerUrlIndex: 0,
            defaultRpcEndpointIndex: 0,
            chainId: '0x1',
            rpcEndpoints: [
              {
                networkClientId: 'mainnet',
                type: 'Infura',
                url: 'https://mainnet.infura.io/v3/',
              },
            ],
            name: 'Ethereum Main Network',
            nativeCurrency: 'ETH',
          },
        },
      };

      // Reinitialize the component with new props
      const wrapper2 = shallow(
        <Provider store={store}>
          <NetworkSettings {...SAMPLE_NETWORKSETTINGS_PROPS_2} />
        </Provider>,
      )
        .find(NetworkSettings)
        .dive();

      const instance2 = wrapper2.instance();

      // Simulate component mounting
      instance2.componentDidMount?.();

      // Check if state was initialized correctly
      expect(wrapper2.state('blockExplorerUrl')).toBe('https://etherscan.io');
      expect(wrapper2.state('nickname')).toBe('Ethereum Main Network');
      expect(wrapper2.state('chainId')).toBe('0x1');
      expect(wrapper2.state('rpcUrl')).toBe('https://mainnet.infura.io/v3/');
    });

    it('should set addMode to true if no networkTypeOrRpcUrl is provided', () => {
      const SAMPLE_NETWORKSETTINGS_PROPS_3 = {
        route: {
          params: {},
        },
        navigation: {
          setOptions: jest.fn(),
          navigate: jest.fn(),
          goBack: jest.fn(),
        },
      };

      // Reinitialize the component without networkTypeOrRpcUrl
      const wrapper3 = shallow(
        <Provider store={store}>
          <NetworkSettings {...SAMPLE_NETWORKSETTINGS_PROPS_3} />
        </Provider>,
      )
        .find(NetworkSettings)
        .dive();

      const instance3 = wrapper3.instance();

      // Simulate component mounting
      instance3.componentDidMount?.();

      // Check if state was initialized with addMode set to true
      expect(wrapper3.state('addMode')).toBe(true);
    });

    it('should handle cases where the network is custom', () => {
      const SAMPLE_NETWORKSETTINGS_PROPS_4 = {
        route: {
          params: { network: 'https://custom-network.io' },
        },
        navigation: {
          setOptions: jest.fn(),
          navigate: jest.fn(),
          goBack: jest.fn(),
        },
        networkConfigurations: {
          '0x123': {
            blockExplorerUrls: ['https://custom-explorer.io'],
            chainId: '0x123',
            defaultRpcEndpointIndex: 0,
            rpcEndpoints: [
              {
                url: 'https://custom-network.io',
                type: RpcEndpointType.Custom,
              },
            ],
            name: 'Custom Network',
            nativeCurrency: 'CUST',
          },
        },
      };

      // Reinitialize the component with custom network
      const wrapper4 = shallow(
        <Provider store={store}>
          <NetworkSettings {...SAMPLE_NETWORKSETTINGS_PROPS_4} />
        </Provider>,
      )
        .find(NetworkSettings)
        .dive();

      const instance4 = wrapper4.instance();

      // Simulate component mounting
      instance4.componentDidMount?.();

      // Check if state was initialized correctly for the custom network
      expect(wrapper4.state('nickname')).toBe('Custom Network');
      expect(wrapper4.state('chainId')).toBe('0x123');
      expect(wrapper4.state('rpcUrl')).toBe('https://custom-network.io');
    });

    it('should call validateRpcAndChainId when matchedChainNetwork changes', () => {
      const instance = wrapper.instance();

      const validateRpcAndChainIdSpy = jest.spyOn(
        wrapper.instance(),
        'validateRpcAndChainId',
      );
      const updateNavBarSpy = jest.spyOn(wrapper.instance(), 'updateNavBar');

      const prevProps = {
        matchedChainNetwork: {
          id: 'network1',
        },
      };

      // Simulate a prop change
      wrapper.setProps({
        matchedChainNetwork: {
          id: 'network2',
        },
      });

      instance.componentDidUpdate(prevProps);

      expect(updateNavBarSpy).toHaveBeenCalled();
      expect(validateRpcAndChainIdSpy).toHaveBeenCalled();
    });
  });

  describe('NetworkSettings - handleNetworkUpdate', () => {
    const mockNavigation = {
      navigate: jest.fn(),
      goBack: jest.fn(),
    };

    const SAMPLE_PROPS = {
      route: {
        params: {
          network: 'mainnet',
        },
      },
      navigation: {
        setOptions: jest.fn(),
        navigate: jest.fn(),
        goBack: jest.fn(),
      },
      networkConfigurations: {
        '0x1': {
          blockExplorerUrls: ['https://etherscan.io'],
          defaultBlockExplorerUrlIndex: 0,
          defaultRpcEndpointIndex: 0,
          chainId: '0x1',
          rpcEndpoints: [
            {
              networkClientId: 'mainnet',
              type: 'Infura',
              url: 'https://mainnet.infura.io/v3/',
            },
          ],
          name: 'Ethereum Main Network',
          nativeCurrency: 'ETH',
        },
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapper4: any = shallow(
      <Provider store={store}>
        <NetworkSettings {...SAMPLE_PROPS} />
      </Provider>,
    )
      .find(NetworkSettings)
      .dive();
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should update the network if the network exists', async () => {
      const instance = wrapper4.instance();

      await instance.handleNetworkUpdate({
        rpcUrl: 'http://localhost:8080',
        rpcUrls: [
          {
            url: 'http://localhost:8080',
            type: 'custom',
            name: '',
          },
        ],
        blockExplorerUrls: ['https://etherscan.io'],
        isNetworkExists: [],
        chainId: '0x1',
        navigation: mockNavigation,
      });

      expect(
        Engine.context.NetworkController.updateNetwork,
      ).toHaveBeenCalledWith(
        '0x1', // chainId
        expect.objectContaining({
          blockExplorerUrls: ['https://etherscan.io'],
          chainId: '0x1',
          defaultBlockExplorerUrlIndex: undefined,
          defaultRpcEndpointIndex: 0,
          name: undefined,
          nativeCurrency: undefined,
          rpcEndpoints: [
            {
              name: '',
              type: 'custom',
              url: 'http://localhost:8080',
            },
          ],
        }),
        { replacementSelectedRpcEndpointIndex: 0 },
      );
    });
  });

  describe('checkIfRpcUrlExists', () => {
    // Mock network configurations
    const networkConfigurations = {
      '0x1': {
        chainId: '0x1',
        name: 'Mainnet',
        rpcEndpoints: [
          {
            url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
          },
        ],
      },
      '0x5': {
        chainId: '0x5',
        name: 'Goerli',
        rpcEndpoints: [
          {
            type: 'custom',
            networkClientId: 'goerli',
            url: 'https://goerli.infura.io/v3/{infuraProjectId}',
          },
        ],
      },
    };

    it('should return matching custom network if RPC URL exists in networkConfigurations', async () => {
      const rpcUrl = 'https://goerli.infura.io/v3/{infuraProjectId}';
      const instance = wrapper.instance();
      const result = await instance.checkIfRpcUrlExists(rpcUrl);

      expect(result).toEqual([networkConfigurations['0x5']]);
    });

    it('should return an empty array if the RPC URL does not exist', async () => {
      const rpcUrl = 'https://random.network.io';
      const instance = wrapper.instance();
      const result = await instance.checkIfRpcUrlExists(rpcUrl);

      expect(result).toEqual([]);
    });

    it('should return an empty array if the RPC URL does not exist with no rpcEndpointUrls present', async () => {
      const rpcUrl = 'https://random.network.io';
      const instance = wrapper.instance();

      wrapper.setProps({
        networkConfigurations: {
          '0x1': {
            chainId: '0x1',
            name: 'Mainnet',
          },
        },
      });

      const result = await instance.checkIfRpcUrlExists(rpcUrl);

      expect(result).toEqual([]);
    });

    it('should return multiple networks if multiple RPC URLs match', async () => {
      const instance = wrapper.instance();

      // Add another endpoint with the same RPC URL
      instance.props.networkConfigurations['0x2'] = {
        chainId: '0x2',
        name: 'Another Network',
        rpcEndpoints: [
          {
            type: 'custom',
            networkClientId: 'goerli',
            url: 'https://goerli.infura.io/v3/{infuraProjectId}',
          },
        ],
      };

      const rpcUrl = 'https://goerli.infura.io/v3/{infuraProjectId}';
      const result = await instance.checkIfRpcUrlExists(rpcUrl);

      expect(result).toEqual([
        networkConfigurations['0x5'],
        instance.props.networkConfigurations['0x2'],
      ]);
    });
  });

  describe('templateInfuraRpc', () => {
    it('should not replace anything if {infuraProjectId} is not in endpoint', () => {
      const instance = wrapper.instance();

      const endpoint = 'https://mainnet.infura.io/v3/someOtherId';
      const result = instance.templateInfuraRpc(endpoint);
      expect(result).toBe('https://mainnet.infura.io/v3/someOtherId');
    });

    it('should replace {infuraProjectId} with an empty string if infuraProjectId is undefined', () => {
      const instance = wrapper.instance();
      const endpoint = 'https://mainnet.infura.io/v3/{infuraProjectId}';
      const result = instance.templateInfuraRpc(endpoint);
      expect(result).toBe('https://mainnet.infura.io/v3/');
    });

    it('should return the original endpoint if it does not end with {infuraProjectId}', () => {
      const instance = wrapper.instance();
      const endpoint = 'https://mainnet.infura.io/v3/anotherProjectId';
      const result = instance.templateInfuraRpc(endpoint);
      expect(result).toBe(endpoint);
    });
  });

  describe('validateChainIdOnSubmit', () => {
    beforeEach(() => {
      // Spying on the methods we want to mock
      jest.spyOn(Logger, 'error'); // Spy on Logger.error
      jest.spyOn(jsonRequest, 'jsonRpcRequest'); // Spy on jsonRpcRequest directly
    });
    afterEach(() => {
      jest.resetAllMocks(); // Clean up mocks after each test
    });

    it('should validate chainId when parsedChainId matches endpoint chainId', async () => {
      const instance = wrapper.instance();

      (jsonRequest.jsonRpcRequest as jest.Mock).mockResolvedValue('0x38');

      const validChainId = '0x38';
      const rpcUrl = 'https://bsc-dataseed.binance.org/';

      await instance.validateChainIdOnSubmit(
        validChainId,
        validChainId,
        rpcUrl,
      );

      expect(instance.state.warningChainId).toBeUndefined();
      expect(jsonRequest.jsonRpcRequest).toHaveBeenCalledWith(
        'https://bsc-dataseed.binance.org/',
        'eth_chainId',
      );
    });

    it('should set a warning when chainId is invalid (RPC error)', async () => {
      const instance = wrapper.instance();

      (jsonRequest.jsonRpcRequest as jest.Mock).mockRejectedValue(
        new Error('RPC error'),
      );

      const invalidChainId = '0xInvalidChainId';
      const rpcUrl = 'https://bsc-dataseed.binance.org/';

      await instance.validateChainIdOnSubmit(
        invalidChainId,
        invalidChainId,
        rpcUrl,
      );

      expect(instance.state.warningChainId).toBe(
        'Could not fetch chain ID. Is your RPC URL correct?',
      );
      expect(Logger.error).toHaveBeenCalled(); // Ensures the error is logged
    });

    it('should set a warning when parsedChainId does not match endpoint chainId', async () => {
      const instance = wrapper.instance();

      (jsonRequest.jsonRpcRequest as jest.Mock).mockResolvedValue('0x39');

      const validChainId = '0x38';
      const rpcUrl = 'https://bsc-dataseed.binance.org/';

      await instance.validateChainIdOnSubmit(
        validChainId,
        validChainId,
        rpcUrl,
      );

      expect(instance.state.warningChainId).toBe(
        'The endpoint returned a different chain ID: 0x39',
      );
    });

    it('should convert endpointChainId to decimal if formChainId is decimal and not hexadecimal', async () => {
      const instance = wrapper.instance();

      (jsonRequest.jsonRpcRequest as jest.Mock).mockResolvedValue('0x38');

      const decimalChainId = '56'; // Decimal chain ID
      const rpcUrl = 'https://bsc-dataseed.binance.org/';

      await instance.validateChainIdOnSubmit(
        decimalChainId,
        decimalChainId,
        rpcUrl,
      );

      expect(instance.state.warningChainId).toBe(
        'The endpoint returned a different chain ID: 56',
      );
    });

    it('should log error if the conversion from hexadecimal to decimal fails', async () => {
      const instance = wrapper.instance();

      (jsonRequest.jsonRpcRequest as jest.Mock).mockResolvedValue(
        '0xInvalidHex',
      );

      const decimalChainId = 'test'; // Invalid decimal chain ID
      const rpcUrl = 'https://bsc-dataseed.binance.org/';

      await instance.validateChainIdOnSubmit(
        decimalChainId,
        decimalChainId,
        rpcUrl,
      );

      expect(Logger.error).toHaveBeenCalledWith(expect.any(Error), {
        endpointChainId: '0xInvalidHex',
        message: 'Failed to convert endpoint chain ID to decimal',
      });
    });
  });

  describe('addRpcUrl', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let instance: any;

    beforeEach(() => {
      instance = wrapper.instance();
      (isNetworkUiRedesignEnabled as jest.Mock).mockImplementation(() => true);

      // Mocking dependent methods
      jest.spyOn(instance, 'disabledByChainId').mockReturnValue(false);
      jest.spyOn(instance, 'disabledBySymbol').mockReturnValue(false);
      jest
        .spyOn(instance, 'checkIfNetworkNotExistsByChainId')
        .mockResolvedValue([]);
      jest.spyOn(instance, 'checkIfNetworkExists').mockResolvedValue(false);
      jest.spyOn(instance, 'validateChainIdOnSubmit').mockResolvedValue(true);
      jest.spyOn(instance, 'handleNetworkUpdate').mockResolvedValue({});
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should add RPC URL correctly', async () => {
      wrapper.setState({
        rpcUrl: 'http://localhost:8545',
        chainId: '0x1',
        ticker: 'ETH',
        nickname: 'Localhost',
        enableAction: true,
        addMode: true,
        editable: false,
      });

      await instance.addRpcUrl();

      expect(instance.handleNetworkUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          rpcUrl: 'http://localhost:8545',
          chainId: '0x1',
          ticker: 'ETH',
          nickname: 'Localhost',
        }),
      );
    });

    it('should return early if CTA is disabled by enableAction', async () => {
      wrapper.setState({ enableAction: false });

      await instance.addRpcUrl();

      expect(instance.handleNetworkUpdate).not.toHaveBeenCalled();
    });

    it('should return early if CTA is disabled by chainId', async () => {
      instance.disabledByChainId.mockReturnValue(true);

      await instance.addRpcUrl();

      expect(instance.handleNetworkUpdate).not.toHaveBeenCalled();
    });

    it('should return early if CTA is disabled by symbol', async () => {
      instance.disabledBySymbol.mockReturnValue(true);

      await instance.addRpcUrl();

      expect(instance.handleNetworkUpdate).not.toHaveBeenCalled();
    });

    it('should not proceed if validateChainIdOnSubmit fails', async () => {
      instance.validateChainIdOnSubmit.mockResolvedValue(false);

      await instance.addRpcUrl();

      expect(instance.handleNetworkUpdate).not.toHaveBeenCalled();
    });

    it('should check if network already exists in add mode', async () => {
      wrapper.setState({ addMode: true, chainId: '0x1', enableAction: true });

      await instance.addRpcUrl();

      expect(instance.checkIfNetworkNotExistsByChainId).toHaveBeenCalledWith(
        '0x1',
      );
      expect(instance.checkIfNetworkExists).not.toHaveBeenCalled();
    });

    it('should check if network exists in edit mode', async () => {
      (isNetworkUiRedesignEnabled as jest.Mock).mockImplementation(() => false);

      wrapper.setState({
        chainId: '0x1',
        editable: false,
        rpcUrl: 'http://localhost:8545',
        enableAction: true,
      });

      await instance.addRpcUrl();

      expect(instance.checkIfNetworkExists).toHaveBeenCalledWith(
        'http://localhost:8545',
      );
      expect(instance.checkIfNetworkNotExistsByChainId).not.toHaveBeenCalled();
    });

    it('should handle custom mainnet condition', async () => {
      wrapper.setProps({
        route: {
          params: {
            isCustomMainnet: true,
          },
        },
      });

      wrapper.setState({
        rpcUrl: 'http://localhost:8545',
        chainId: '0x1',
        ticker: 'ETH',
        nickname: 'Localhost',
        enableAction: true,
        addMode: true,
        editable: false,
      });

      await instance.addRpcUrl();

      expect(instance.handleNetworkUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          isCustomMainnet: true,
          showNetworkOnboarding: false,
        }),
      );
    });

    it('should handle network switch pop to wallet condition', async () => {
      wrapper.setProps({
        route: {
          params: {
            shouldNetworkSwitchPopToWallet: false,
          },
        },
      });

      wrapper.setState({
        rpcUrl: 'http://localhost:8545',
        chainId: '0x1',
        ticker: 'ETH',
        nickname: 'Localhost',
        enableAction: true,
        addMode: true,
        editable: false,
      });

      await instance.addRpcUrl();

      expect(instance.handleNetworkUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          shouldNetworkSwitchPopToWallet: false,
        }),
      );
    });

    it('should not call setTokenNetworkFilter when portfolio view is disabled', async () => {
      jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(false);
      const tokenNetworkFilterSpy = jest.spyOn(
        PreferencesController,
        'setTokenNetworkFilter',
      );

      wrapper.setState({
        rpcUrl: 'http://localhost:8545',
        chainId: '0x1',
        ticker: 'ETH',
        nickname: 'Localhost',
        enableAction: true,
      });

      await wrapper.instance().addRpcUrl();
      expect(tokenNetworkFilterSpy).toHaveBeenCalledTimes(0);
    });

    it('should call setTokenNetworkFilter when portfolio view is enabled', async () => {
      jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);
      const tokenNetworkFilterSpy = jest.spyOn(
        PreferencesController,
        'setTokenNetworkFilter',
      );

      wrapper.setState({
        rpcUrl: 'http://localhost:8545',
        chainId: '0x1',
        ticker: 'ETH',
        nickname: 'Localhost',
        enableAction: true,
      });

      await wrapper.instance().addRpcUrl();
      expect(tokenNetworkFilterSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkIfNetworkExists', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let instance: any;

    beforeEach(() => {
      instance = wrapper.instance();

      jest.spyOn(instance, 'setState');
      (isNetworkUiRedesignEnabled as jest.Mock).mockImplementation(() => true);
    });

    afterEach(() => {
      jest.clearAllMocks(); // Clear all spies after each test
    });

    it('should return custom network if rpcUrl exists in networkConfigurations and UI redesign is disabled', async () => {
      (isNetworkUiRedesignEnabled as jest.Mock).mockImplementation(() => false);

      const rpcUrl = 'http://localhost:8545';

      // Mocking props
      wrapper.setProps({
        networkConfigurations: {
          customNetwork1: { rpcUrl },
        },
      });

      const result = await instance.checkIfNetworkExists(rpcUrl);

      expect(result).toEqual([{ rpcUrl }]);
      expect(instance.setState).toHaveBeenCalledWith({
        warningRpcUrl: 'This network has already been added.',
      });
    });

    it('should return custom network if rpcUrl exists in networkConfigurations and UI redesign is enabled', async () => {
      const rpcUrl = 'http://localhost:8545';

      // Mocking props and enabling network UI redesign
      wrapper.setProps({
        networkConfigurations: {
          customNetwork1: { rpcUrl },
        },
      });

      const result = await instance.checkIfNetworkExists(rpcUrl);

      expect(result).toEqual([{ rpcUrl }]);
      expect(instance.setState).not.toHaveBeenCalled(); // Should not set warning when redesign is enabled
    });
  });

  describe('Feature Flag: isRemoveGlobalNetworkSelectorEnabled', () => {
    const mockIsRemoveGlobalNetworkSelectorEnabled =
      isRemoveGlobalNetworkSelectorEnabled as jest.MockedFunction<
        typeof isRemoveGlobalNetworkSelectorEnabled
      >;

    beforeEach(() => {
      // Reset feature flag mock
      mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);
    });

    describe('when feature flag is enabled', () => {
      beforeEach(() => {
        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);
      });

      it('should call NetworkEnablementController.enableNetwork when feature flag is enabled', async () => {
        const { NetworkEnablementController } = Engine.context;
        const enableNetworkSpy = jest.spyOn(
          NetworkEnablementController,
          'enableNetwork',
        );

        // Mock validateChainIdOnSubmit to return true so it doesn't return early
        jest
          .spyOn(wrapper.instance(), 'validateChainIdOnSubmit')
          .mockResolvedValue(true);

        // Mock handleNetworkUpdate to prevent actual network addition
        jest
          .spyOn(wrapper.instance(), 'handleNetworkUpdate')
          .mockResolvedValue({});

        wrapper.setState({
          rpcUrl: 'http://localhost:8545',
          chainId: '0x1',
          ticker: 'ETH',
          nickname: 'Localhost',
          enableAction: true,
          addMode: true,
          editable: false,
          rpcUrls: [{ url: 'http://localhost:8545' }],
          blockExplorerUrls: [],
        });

        await wrapper.instance().addRpcUrl();

        // Verify that the feature flag is enabled
        expect(mockIsRemoveGlobalNetworkSelectorEnabled()).toBe(true);

        // Verify that enableNetwork was called with the correct chainId
        expect(enableNetworkSpy).toHaveBeenCalledWith('0x1');
      });

      it('should have proper Engine controller setup when feature flag is enabled', () => {
        // Verify that the feature flag is enabled
        expect(mockIsRemoveGlobalNetworkSelectorEnabled()).toBe(true);

        // Verify that the necessary controllers are available
        expect(
          Engine.context.NetworkEnablementController.enableNetwork,
        ).toBeDefined();
        expect(Engine.context.NetworkController.addNetwork).toBeDefined();
        expect(Engine.context.NetworkController.updateNetwork).toBeDefined();
      });
    });

    describe('when feature flag is disabled', () => {
      beforeEach(() => {
        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);
      });

      it('should not call NetworkEnablementController.enableNetwork when feature flag is disabled', async () => {
        const { NetworkEnablementController } = Engine.context;
        const setEnabledNetworkSpy = jest.spyOn(
          NetworkEnablementController,
          'enableNetwork',
        );

        wrapper.setState({
          rpcUrl: 'http://localhost:8545',
          chainId: '0x1',
          ticker: 'ETH',
          nickname: 'Localhost',
          enableAction: true,
          addMode: true,
          editable: false,
        });

        await wrapper.instance().addRpcUrl();

        // Verify that the feature flag is disabled
        expect(mockIsRemoveGlobalNetworkSelectorEnabled()).toBe(false);

        // Verify that setEnabledNetwork was not called
        expect(setEnabledNetworkSpy).not.toHaveBeenCalled();
      });

      it('should still have proper Engine controller setup when feature flag is disabled', () => {
        // Verify that the feature flag is disabled
        expect(mockIsRemoveGlobalNetworkSelectorEnabled()).toBe(false);

        // Verify that the necessary controllers are still available
        expect(
          Engine.context.NetworkEnablementController.enableNetwork,
        ).toBeDefined();
        expect(Engine.context.NetworkController.addNetwork).toBeDefined();
        expect(Engine.context.NetworkController.updateNetwork).toBeDefined();
      });
    });
  });
});

describe('NetworkSettings - showNetworkModal', () => {
  it('should not crash', () => {
    const networkConfiguration = {
      blockExplorerUrls: ['https://etherscan.io'],
      defaultBlockExplorerUrlIndex: 0,
      defaultRpcEndpointIndex: 0,
      chainId: '0x1',
      rpcEndpoints: [
        {
          networkClientId: 'mainnet',
          type: 'Infura',
          url: 'https://mainnet.infura.io/v3/',
        },
      ],
      name: 'Ethereum Main Network',
      nativeCurrency: 'ETH',
    };
    const props = {
      route: {
        params: {
          network: 'mainnet',
        },
      },
      navigation: {
        setOptions: jest.fn(),
        navigate: jest.fn(),
        goBack: jest.fn(),
      },
      networkConfigurations: {
        '0x1': networkConfiguration,
      },
    };

    const wrapper = shallow(
      <Provider store={store}>
        <NetworkSettings {...props} />
      </Provider>,
    )
      .find(NetworkSettings)
      .dive();

    const instance = wrapper.instance() as NetworkSettings;

    expect(() => instance.showNetworkModal(networkConfiguration)).not.toThrow();
  });
});
