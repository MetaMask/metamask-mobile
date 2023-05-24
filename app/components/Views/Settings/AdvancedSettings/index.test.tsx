import React from 'react';
import { shallow } from 'enzyme';
import AdvancedSettings from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { ETH_SIGN_SWITCH_CONTAINER_TEST_ID } from './AdvancedSettings.testIds';
import { fireEvent, within } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import { Store, AnyAction } from 'redux';

const mockStore = configureMockStore();
let initialState: any;
let store: Store<any, AnyAction>;

beforeEach(() => {
  initialState = {
    settings: { showHexData: true },
    engine: {
      backgroundState: {
        PreferencesController: {
          ipfsGateway: 'https://ipfs.io/ipfs/',
          disabledRpcMethodPreferences: {
            eth_sign: false,
          },
        },
        NetworkController: {
          providerConfig: { chainId: '1' },
        },
      },
    },
  };
  store = mockStore(initialState);
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
    const { getByTestId } = renderWithProvider(<AdvancedSettings />, {
      state: initialState,
    });

    const switchContainer = getByTestId(ETH_SIGN_SWITCH_CONTAINER_TEST_ID);
    expect(switchContainer).toBeDefined();

    const switchElement = within(switchContainer).getByRole('switch');
    expect(switchElement.props.value).toBe(false);

    const textElementOff = within(switchContainer).getByText(
      strings('app_settings.toggleEthSignOff'),
    );
    expect(textElementOff).toBeDefined();
  });

  it('should render eth_sign switch on with correct label', () => {
    initialState.engine.backgroundState.PreferencesController.disabledRpcMethodPreferences.eth_sign =
      true;

    const { getByTestId } = renderWithProvider(<AdvancedSettings />, {
      state: initialState,
    });

    const switchContainer = getByTestId(ETH_SIGN_SWITCH_CONTAINER_TEST_ID);
    expect(switchContainer).toBeDefined();

    const switchElement = within(switchContainer).getByRole('switch');
    expect(switchElement.props.value).toBe(true);

    const textElementOn = within(switchContainer).getByText(
      strings('app_settings.toggleEthSignOn'),
    );
    expect(textElementOn).toBeDefined();
  });

  it.skip('TODO should call navigate to EthSignFriction when eth_sign is switched on', () => {
    const { getByTestId } = renderWithProvider(<AdvancedSettings />, {
      state: initialState,
    });

    const switchContainer = getByTestId(ETH_SIGN_SWITCH_CONTAINER_TEST_ID);
    expect(switchContainer).toBeDefined();
    const switchElement = within(switchContainer).getByRole('switch');
    fireEvent.press(switchElement);
    // TODO I would like to test that the event triggers the onEthSignSettingChangeAttempt method that
    // either calls navigate to EthSignFriction or not depending on the value of the switch
    // test:
    // - if switch new value is "on", navigate to EthSignFriction bottom sheet
    // - if switch new value is "off", simply update the value of the switch
  });
});
