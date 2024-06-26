// NetworkSettings.test.js or NetworkSettings.test.tsx

import React from 'react';
import { shallow } from 'enzyme';
import { NetworkSettings } from './'; // Import the undecorated component
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { ThemeContext, mockTheme } from '../../../../../../app/util/theme';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { NETWORKS_CHAIN_ID } from '../../../../../constants/network';
import { getEtherscanBaseUrl } from '../../../../../util/etherscan';
import Networks, { getAllNetworks } from '../../../../../util/networks';
import { strings } from '../../../../../../locales/i18n';

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
  navigation: { setOptions: jest.fn(), navigate: jest.fn(), goBack: jest.fn() },
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
      route: { params: { networkTypeOrRpcUrl: true } },
      navigation: {
        setOptions: jest.fn(),
        navigate: jest.fn(),
        goBack: jest.fn(),
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

    expect(wrapper2.state('blockExplorerUrl')).toBe(undefined);
    expect(wrapper2.state('nickname')).toBe(undefined);
    expect(wrapper2.state('chainId')).toBe(undefined);
    expect(wrapper2.state('rpcUrl')).toBe(undefined);
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
});
