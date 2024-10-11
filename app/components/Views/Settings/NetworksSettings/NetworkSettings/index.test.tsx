import React from 'react';
import { shallow } from 'enzyme';
import { NetworkSettings } from './'; // Import the undecorated component
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { ThemeContext, mockTheme } from '../../../../../../app/util/theme';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { isNetworkUiRedesignEnabled } from '../../../../../util/networks/isNetworkUiRedesignEnabled';

// Mock the entire module
jest.mock('../../../../../util/networks/isNetworkUiRedesignEnabled', () => ({
  isNetworkUiRedesignEnabled: jest.fn(),
}));

jest.useFakeTimers();
const mockStore = configureMockStore();

const initialState = {
  engine: {
    backgroundState,
  },
  networkOnboarded: {
    networkOnboardedState: { '1': true },
  },
};

const store = mockStore(initialState);

const SAMPLE_NETWORKSETTINGS_PROPS = {
  route: { params: {} },
  networkConfigurations: {
    chainId: '0x1',
    rpcUrl: 'https://mainnet.infura.io/v3/YOUR-PROJECT-ID',
    nickname: 'Ethereum mainnet',
    rpcPrefs: {
      blockExplorerUrl: 'https://etherscan.io',
    },
    ticker: 'ETH',
  },
  navigation: { setOptions: jest.fn(), navigate: jest.fn(), goBack: jest.fn() },
  matchedChainNetwork: {
    safeChainsList: [
      {
        name: 'Ethereum Mainnet',
        chain: 'ETH',
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
        chainId: 1,
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
    ],
  },
};

describe('NetworkSettings', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let wrapper: any;

  beforeEach(() => {
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

  it('should return an empty string if the mainnet configuration is not found', () => {
    const newProps = {
      ...SAMPLE_NETWORKSETTINGS_PROPS,
      networkConfigurations: {
        '4': {
          chainId: '4',
          rpcUrl: 'https://rinkeby.infura.io/v3/YOUR-PROJECT-ID',
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

    const instance = wrapper.instance();
    const rpcUrl = instance.getCustomMainnetRPCURL();
    expect(rpcUrl).toBe('');
  });
  it('should update state and call getCurrentState on RPC URL change', async () => {
    const getCurrentStateSpy = jest.spyOn(
      wrapper.instance(),
      'getCurrentState',
    );

    await wrapper.instance().onRpcUrlChange('http://localhost:8545');

    expect(wrapper.state('rpcUrl')).toBe('http://localhost:8545');
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
          chainId: '0x1',
          rpcUrl: 'https://mainnet.infura.io/v3/YOUR-PROJECT-ID',
          nickname: 'Ethereum mainnet',
          rpcPrefs: {
            blockExplorerUrl: 'https://etherscan.io',
          },
          ticker: 'ETH',
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
          chainId: '0x1',
          rpcUrl: 'https://mainnet.infura.io/v3/YOUR-PROJECT-ID',
          nickname: 'Ethereum mainnet',
          rpcPrefs: {
            blockExplorerUrl: 'https://etherscan.io',
          },
          ticker: 'ETH',
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
          chainId: '0x1',
          rpcUrl: 'https://mainnet.infura.io/v3/YOUR-PROJECT-ID',
          nickname: 'Ethereum mainnet',
          rpcPrefs: {
            blockExplorerUrl: 'https://etherscan.io',
          },
          ticker: 'ETH',
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

  it('should update state and call getCurrentState on block explorer URL change', async () => {
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

  describe('getDecimalChainId', () => {
    let wrapperTest;
    // Do not need to mock entire Engine. Only need subset of data for testing purposes.
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let instanceTest: any;

    beforeEach(() => {
      wrapperTest = shallow(
        <Provider store={store}>
          <ThemeContext.Provider value={mockTheme}>
            <NetworkSettings {...SAMPLE_NETWORKSETTINGS_PROPS} />
          </ThemeContext.Provider>
        </Provider>,
      )
        .find(NetworkSettings)
        .dive();

      instanceTest = wrapperTest.instance();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should return the chainId as is if it is falsy', () => {
      expect(instanceTest.getDecimalChainId(null)).toBe(null);
      expect(instanceTest.getDecimalChainId(undefined)).toBe(undefined);
    });

    it('should return the chainId as is if it is not a string', () => {
      expect(instanceTest.getDecimalChainId(123)).toBe(123);
    });

    it('should return the chainId as is if it does not start with 0x', () => {
      expect(instanceTest.getDecimalChainId('123')).toBe('123');
      expect(instanceTest.getDecimalChainId('abc')).toBe('abc');
    });

    it('should convert hex chainId to decimal string', () => {
      expect(instanceTest.getDecimalChainId('0x1')).toBe('1');
      expect(instanceTest.getDecimalChainId('0xa')).toBe('10');
      expect(instanceTest.getDecimalChainId('0x64')).toBe('100');
      expect(instanceTest.getDecimalChainId('0x12c')).toBe('300');
    });

    it('should handle edge cases for hex chainId conversion', () => {
      expect(instanceTest.getDecimalChainId('0x0')).toBe('0');
      expect(instanceTest.getDecimalChainId('0xff')).toBe('255');
      expect(instanceTest.getDecimalChainId('0x7fffffffffffffff')).toBe(
        '9223372036854776000',
      );
    });
  });
});
