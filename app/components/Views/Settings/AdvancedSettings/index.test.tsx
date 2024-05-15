import React from 'react';
import { shallow } from 'enzyme';
import AdvancedSettings from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import { Store, AnyAction } from 'redux';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';
import Device from '../../../../util/device';

const originalFetch = global.fetch;

const mockStore = configureMockStore();
let initialState: any;
let store: Store<any, AnyAction>;
const mockNavigate = jest.fn();
let mockSetDisabledRpcMethodPreference: jest.Mock<any, any>;
let mockSetSmartTransactionsOptInStatus: jest.Mock<any, any>;

beforeEach(() => {
  initialState = {
    settings: { showHexData: true },
    engine: {
      backgroundState: initialBackgroundState,
    },
  };
  store = mockStore(initialState);
  mockNavigate.mockClear();
  mockSetDisabledRpcMethodPreference.mockClear();
  mockSetSmartTransactionsOptInStatus.mockClear();
});

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    navigation: {
      navigate: mockNavigate,
    },
  };
});

const mockEngine = Engine;

jest.mock('../../../../core/Engine', () => {
  mockSetDisabledRpcMethodPreference = jest.fn();
  mockSetSmartTransactionsOptInStatus = jest.fn();
  return {
    init: () => mockEngine.init({}),
    context: {
      PreferencesController: {
        setDisabledRpcMethodPreference: mockSetDisabledRpcMethodPreference,
        setSmartTransactionsOptInStatus: mockSetSmartTransactionsOptInStatus,
      },
    },
  };
});

describe('AdvancedSettings', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <AdvancedSettings />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render eth_sign switch off by default with correct label', () => {
    const { getByLabelText, getByText } = renderWithProvider(
      <AdvancedSettings
        navigation={{ navigate: mockNavigate, setOptions: jest.fn() }}
      />,
      {
        state: initialState,
      },
    );

    const switchElement = getByLabelText(
      strings('app_settings.enable_eth_sign'),
    );
    expect(switchElement.props.value).toBe(false);

    const textElementOff = getByText(strings('app_settings.toggleEthSignOff'));
    expect(textElementOff).toBeDefined();
  });

  it('should render eth_sign switch on with correct label', () => {
    initialState.engine.backgroundState.PreferencesController.disabledRpcMethodPreferences.eth_sign =
      true;

    const { getByLabelText, getByText } = renderWithProvider(
      <AdvancedSettings
        navigation={{ navigate: mockNavigate, setOptions: jest.fn() }}
      />,
      {
        state: initialState,
      },
    );

    const switchElement = getByLabelText(
      strings('app_settings.enable_eth_sign'),
    );
    expect(switchElement.props.value).toBe(true);

    const textElementOn = getByText(strings('app_settings.toggleEthSignOn'));
    expect(textElementOn).toBeDefined();
  });

  it('should call navigate to EthSignFriction when eth_sign is switched on', async () => {
    const { getByLabelText } = renderWithProvider(
      <AdvancedSettings
        navigation={{ navigate: mockNavigate, setOptions: jest.fn() }}
      />,
      {
        state: initialState,
      },
    );

    const switchElement = getByLabelText(
      strings('app_settings.enable_eth_sign'),
    );
    fireEvent(switchElement, 'onValueChange', true);

    expect(mockNavigate).toBeCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.ETH_SIGN_FRICTION,
    });
    expect(mockSetDisabledRpcMethodPreference).not.toBeCalled();
  });

  it('should directly set setting to off when switched off', async () => {
    const { getByLabelText } = renderWithProvider(
      <AdvancedSettings
        navigation={{ navigate: mockNavigate, setOptions: jest.fn() }}
      />,
      {
        state: initialState,
      },
    );

    const switchElement = getByLabelText(
      strings('app_settings.enable_eth_sign'),
    );
    fireEvent(switchElement, 'onValueChange', false);
    expect(mockNavigate).not.toBeCalled();
    expect(mockSetDisabledRpcMethodPreference).toBeCalledWith(
      'eth_sign',
      false,
    );
  });

  describe('Smart Transactions Opt In', () => {
    afterEach(() => {
      global.fetch = originalFetch;
    });

    Device.isIos = jest.fn().mockReturnValue(true);
    Device.isAndroid = jest.fn().mockReturnValue(false);

    it('should render smart transactions opt in switch off by default', async () => {
      const { findByLabelText } = renderWithProvider(
        <AdvancedSettings
          navigation={{ navigate: mockNavigate, setOptions: jest.fn() }}
        />,
        {
          state: initialState,
        },
      );

      const switchElement = await findByLabelText(
        strings('app_settings.smart_transactions_opt_in_heading'),
      );
      expect(switchElement.props.value).toBe(false);
    });
    it('should update smartTransactionsOptInStatus when smart transactions opt in is pressed', async () => {
      const { findByLabelText } = renderWithProvider(
        <AdvancedSettings
          navigation={{ navigate: mockNavigate, setOptions: jest.fn() }}
        />,
        {
          state: initialState,
        },
      );

      const switchElement = await findByLabelText(
        strings('app_settings.smart_transactions_opt_in_heading'),
      );

      fireEvent(switchElement, 'onValueChange', true);

      expect(mockSetSmartTransactionsOptInStatus).toBeCalledWith(true);
    });
  });
});
