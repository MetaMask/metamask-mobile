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
import { mockNetworkState } from '../../../../../util/test/network';
// eslint-disable-next-line import/no-namespace
import * as jsonRequest from '../../../../../util/jsonRpcRequest';
import Logger from '../../../../../util/Logger';
import Engine from '../../../../../core/Engine';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
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

const mockTrackEvent = jest.fn();

const mockCreateEventBuilder = jest.fn((eventName) => {
  let properties = {};
  return {
    addProperties(props: Record<string, unknown>) {
      properties = { ...properties, ...props };
      return this;
    },
    build() {
      return {
        name: eventName,
        properties,
      };
    },
  };
});

jest.mock('../../../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
  withMetricsAwareness: (Component: unknown) => Component,
}));

// Mock the feature flag
jest.mock('../../../../../util/networks', () => {
  const mockGetAllNetworks = jest.fn(() => ['mainnet', 'sepolia']);

  return {
    ...jest.requireActual('../../../../../util/networks'),
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

  it('should render the component correctly', () => {
    const component = shallow(
      <Provider store={store}>
        <NetworkSettings />
      </Provider>,
    );

    expect(component).toMatchSnapshot();
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
      await instance.onChainIDChange('0x2');
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

    it('should not show warning symbol for Sepolia when getting symbol from network configuration', async () => {
      const instance = wrapper.instance();

      wrapper.setProps({
        useSafeChainsListValidation: true,
        networkConfigurations: {
          '0xaa36a7': {
            chainId: '0xaa36a7',
            defaultBlockExplorerUrlIndex: 0,
            defaultRpcEndpointIndex: 0,
            name: 'Sepolia',
            nativeCurrency: 'SepoliaETH',
          },
        },
      });

      instance.setState({
        chainId: '0xaa36a7', // Sepolia chain ID
        ticker: 'SepoliaETH',
      });

      await instance.validateSymbol();

      expect(instance.state.warningSymbol).toBeUndefined(); // No warning for valid symbol
    });

    it('should fallback to chainToMatch symbol if network configuration is not found and show warning symbol', async () => {
      const instance = wrapper.instance();

      wrapper.setProps({
        useSafeChainsListValidation: true,
        networkConfigurations: {},
      });

      instance.setState({
        chainId: '0xaa36a7', // Sepolia chain ID
        ticker: 'SepoliaETH',
      });

      const chainToMatch = {
        name: 'Test Network',
        nativeCurrency: { symbol: 'TEST' },
      };
      await instance.validateSymbol(chainToMatch);

      expect(instance.state.warningSymbol).toBe('TEST');
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

    it('tracks RPC update event when trackRpcUpdateFromBanner is true', async () => {
      const PROPS_WITH_METRICS = {
        ...SAMPLE_PROPS,
        metrics: {
          trackEvent: mockTrackEvent,
          createEventBuilder: mockCreateEventBuilder,
        },
        networkConfigurations: {
          '0x64': {
            blockExplorerUrls: ['https://etherscan.io'],
            defaultBlockExplorerUrlIndex: 0,
            defaultRpcEndpointIndex: 0,
            chainId: '0x64',
            rpcEndpoints: [
              {
                networkClientId: 'custom',
                type: 'custom',
                url: 'https://mainnet.infura.io/v3/',
              },
            ],
            name: 'Custom Network',
            nativeCurrency: 'ETH',
          },
        },
      };

      const wrapper5 = shallow(
        <Provider store={store}>
          <NetworkSettings {...PROPS_WITH_METRICS} />
        </Provider>,
      )
        .find(NetworkSettings)
        .dive();

      const instance = wrapper5.instance() as NetworkSettings;

      await instance.handleNetworkUpdate({
        rpcUrl: 'https://monad-mainnet.infura.io/v3/',
        rpcUrls: [
          {
            url: 'https://monad-mainnet.infura.io/v3/',
            type: 'custom',
            name: 'Monad RPC',
          },
        ],
        blockExplorerUrls: ['https://etherscan.io'],
        blockExplorerUrl: 'https://etherscan.io',
        nickname: 'Custom Network',
        ticker: 'ETH',
        isNetworkExists: [],
        chainId: '0x64',
        navigation: mockNavigation,
        isCustomMainnet: false,
        shouldNetworkSwitchPopToWallet: true,
        trackRpcUpdateFromBanner: true,
      });

      expect(Engine.context.NetworkController.updateNetwork).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledWith(
        mockCreateEventBuilder(
          MetaMetricsEvents.NetworkConnectionBannerRpcUpdated,
        )
          .addProperties({
            chain_id_caip: 'eip155:100',
            from_rpc_domain: 'mainnet.infura.io',
            to_rpc_domain: 'monad-mainnet.infura.io',
          })
          .build(),
      );
    });

    it('does not track RPC update event when trackRpcUpdateFromBanner is false', async () => {
      const PROPS_WITHOUT_TRACKING = {
        ...SAMPLE_PROPS,
        metrics: {
          trackEvent: mockTrackEvent,
          createEventBuilder: mockCreateEventBuilder,
        },
        networkConfigurations: {
          '0x64': {
            blockExplorerUrls: ['https://etherscan.io'],
            defaultBlockExplorerUrlIndex: 0,
            defaultRpcEndpointIndex: 0,
            chainId: '0x64',
            rpcEndpoints: [
              {
                networkClientId: 'custom',
                type: 'custom',
                url: 'https://mainnet.infura.io/v3/',
              },
            ],
            name: 'Custom Network',
            nativeCurrency: 'ETH',
          },
        },
      };

      const wrapper6 = shallow(
        <Provider store={store}>
          <NetworkSettings {...PROPS_WITHOUT_TRACKING} />
        </Provider>,
      )
        .find(NetworkSettings)
        .dive();

      const instance = wrapper6.instance() as NetworkSettings;

      await instance.handleNetworkUpdate({
        rpcUrl: 'https://monad-mainnet.infura.io/v3/',
        rpcUrls: [
          {
            url: 'https://monad-mainnet.infura.io/v3/',
            type: 'custom',
            name: 'Monad RPC',
          },
        ],
        blockExplorerUrls: ['https://etherscan.io'],
        blockExplorerUrl: 'https://etherscan.io',
        nickname: 'Custom Network',
        ticker: 'ETH',
        isNetworkExists: [],
        chainId: '0x64',
        navigation: mockNavigation,
        isCustomMainnet: false,
        shouldNetworkSwitchPopToWallet: true,
        trackRpcUpdateFromBanner: false,
      });

      expect(Engine.context.NetworkController.updateNetwork).toHaveBeenCalled();
      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('sanitizes custom RPC URLs as "custom" in tracking event', async () => {
      const PROPS_WITH_CUSTOM_RPC = {
        ...SAMPLE_PROPS,
        metrics: {
          trackEvent: mockTrackEvent,
          createEventBuilder: mockCreateEventBuilder,
        },
        networkConfigurations: {
          '0x64': {
            blockExplorerUrls: ['https://etherscan.io'],
            defaultBlockExplorerUrlIndex: 0,
            defaultRpcEndpointIndex: 0,
            chainId: '0x64',
            rpcEndpoints: [
              {
                networkClientId: 'custom',
                type: 'custom',
                url: 'https://my-private-rpc.com',
              },
            ],
            name: 'Custom Network',
            nativeCurrency: 'ETH',
          },
        },
      };

      const wrapper7 = shallow(
        <Provider store={store}>
          <NetworkSettings {...PROPS_WITH_CUSTOM_RPC} />
        </Provider>,
      )
        .find(NetworkSettings)
        .dive();

      const instance = wrapper7.instance() as NetworkSettings;

      await instance.handleNetworkUpdate({
        rpcUrl: 'https://another-private-rpc.com',
        rpcUrls: [
          {
            url: 'https://another-private-rpc.com',
            type: 'custom',
            name: 'Another Custom RPC',
          },
        ],
        blockExplorerUrls: ['https://etherscan.io'],
        blockExplorerUrl: 'https://etherscan.io',
        nickname: 'Custom Network',
        ticker: 'ETH',
        isNetworkExists: [],
        chainId: '0x64',
        navigation: mockNavigation,
        isCustomMainnet: false,
        shouldNetworkSwitchPopToWallet: true,
        trackRpcUpdateFromBanner: true,
      });

      expect(Engine.context.NetworkController.updateNetwork).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledWith(
        mockCreateEventBuilder(
          MetaMetricsEvents.NetworkConnectionBannerRpcUpdated,
        )
          .addProperties({
            chain_id_caip: 'eip155:100',
            from_rpc_domain: 'custom',
            to_rpc_domain: 'custom',
          })
          .build(),
      );
    });

    it('tracks unknown for missing old RPC endpoint', async () => {
      const PROPS_WITHOUT_OLD_ENDPOINT = {
        ...SAMPLE_PROPS,
        metrics: {
          trackEvent: mockTrackEvent,
          createEventBuilder: mockCreateEventBuilder,
        },
        networkConfigurations: {
          '0x64': {
            blockExplorerUrls: ['https://etherscan.io'],
            defaultBlockExplorerUrlIndex: 0,
            defaultRpcEndpointIndex: undefined,
            chainId: '0x64',
            rpcEndpoints: [],
            name: 'Custom Network',
            nativeCurrency: 'ETH',
          },
        },
      };

      const wrapper8 = shallow(
        <Provider store={store}>
          <NetworkSettings {...PROPS_WITHOUT_OLD_ENDPOINT} />
        </Provider>,
      )
        .find(NetworkSettings)
        .dive();

      const instance = wrapper8.instance() as NetworkSettings;

      await instance.handleNetworkUpdate({
        rpcUrl: 'https://new-rpc.infura.io/v3/',
        rpcUrls: [
          {
            url: 'https://new-rpc.infura.io/v3/',
            type: 'custom',
            name: 'New RPC',
          },
        ],
        blockExplorerUrls: ['https://etherscan.io'],
        blockExplorerUrl: 'https://etherscan.io',
        nickname: 'Custom Network',
        ticker: 'ETH',
        isNetworkExists: [],
        chainId: '0x64',
        navigation: mockNavigation,
        isCustomMainnet: false,
        shouldNetworkSwitchPopToWallet: true,
        trackRpcUpdateFromBanner: true,
      });

      expect(Engine.context.NetworkController.updateNetwork).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledWith(
        mockCreateEventBuilder(
          MetaMetricsEvents.NetworkConnectionBannerRpcUpdated,
        )
          .addProperties({
            chain_id_caip: 'eip155:100',
            from_rpc_domain: 'unknown',
            to_rpc_domain: 'new-rpc.infura.io',
          })
          .build(),
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

    it('should always call setTokenNetworkFilter when adding a network', async () => {
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
      // setTokenNetworkFilter is always called regardless of feature flags
      expect(tokenNetworkFilterSpy).toHaveBeenCalledTimes(1);
    });

    it('should call setTokenNetworkFilter with correct chainId when adding a network', async () => {
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
      expect(tokenNetworkFilterSpy).toHaveBeenCalledWith({ '0x1': true });
    });
  });

  describe('checkIfNetworkExists', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let instance: any;

    beforeEach(() => {
      instance = wrapper.instance();

      jest.spyOn(instance, 'setState');
    });

    afterEach(() => {
      jest.clearAllMocks(); // Clear all spies after each test
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

  describe('Network Manager Integration', () => {
    it('calls NetworkEnablementController.enableNetwork when adding a network', async () => {
      const { NetworkEnablementController } = Engine.context;
      const enableNetworkSpy = jest.spyOn(
        NetworkEnablementController,
        'enableNetwork',
      );

      const instance = wrapper.instance();

      jest.spyOn(instance, 'disabledByChainId').mockReturnValue(false);
      jest.spyOn(instance, 'disabledBySymbol').mockReturnValue(false);
      jest
        .spyOn(instance, 'checkIfNetworkNotExistsByChainId')
        .mockResolvedValue([]);
      jest.spyOn(instance, 'validateChainIdOnSubmit').mockResolvedValue(true);
      jest.spyOn(instance, 'handleNetworkUpdate').mockResolvedValue({});

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

      await instance.addRpcUrl();

      // Verify that enableNetwork was called with the correct chainId
      expect(enableNetworkSpy).toHaveBeenCalledWith('0x1');
    });

    it('should have proper Engine controller setup', () => {
      // Verify that the necessary controllers are available
      expect(
        Engine.context.NetworkEnablementController.enableNetwork,
      ).toBeDefined();
      expect(Engine.context.NetworkController.addNetwork).toBeDefined();
      expect(Engine.context.NetworkController.updateNetwork).toBeDefined();
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
