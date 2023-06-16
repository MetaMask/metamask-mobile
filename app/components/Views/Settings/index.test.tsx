import React from 'react';
import { shallow } from 'enzyme';
import Settings from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import renderWithProvider from '../../../util/test/renderWithProvider';
jest.unmock('react-redux');
const mockStore = configureMockStore();
const initialState = {
  user: { seedphraseBackedUp: true, passwordSet: true },
  privacy: { approvedHosts: [] },
  browser: { history: [] },
  settings: {
    lockTime: 1000,
    searchEngine: 'DuckDuckGo',
    useBlockieIcon: true,
  },
  engine: {
    backgroundState: {
      CurrencyRateController: { currentCurrency: 'USD' },
      NetworkController: {
        providerConfig: {
          type: 'mainnet',
        },
      },
      PreferencesController: { selectedAddress: '0x0' },
    },
  },
};

const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
    }),
  };
});
const store = mockStore(initialState);

describe('Settings', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <Settings />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render general settings button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const generalSettings = getByTestId('general-settings');
    expect(generalSettings).toBeDefined();
  });
  it('should render security settings button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const securitySettings = getByTestId('security-settings');
    expect(securitySettings).toBeDefined();
  });
  it('should render advanced settings button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const advancedSettings = getByTestId('advanced-settings');
    expect(advancedSettings).toBeDefined();
  });
  it('should render contacts settings button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const contactsSettings = getByTestId('contacts-settings');
    expect(contactsSettings).toBeDefined();
  });
  it('should render network settings button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const networksSettings = getByTestId('networks-settings');
    expect(networksSettings).toBeDefined();
  });
  it('should render feature request button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const onRampSettings = getByTestId('on-ramp-settings');
    expect(onRampSettings).toBeDefined();
  });
  it('should render experimental settings button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const experimentalSettings = getByTestId('experimental-settings');
    expect(experimentalSettings).toBeDefined();
  });
  it('should render about metamask button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const aboutMetamask = getByTestId('about-metamask-settings');
    expect(aboutMetamask).toBeDefined();
  });
  it('should render request feature button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const requestFeature = getByTestId('request-feature');
    expect(requestFeature).toBeDefined();
  });
  it('should render contact support button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const contactSupport = getByTestId('contact-support');
    expect(contactSupport).toBeDefined();
  });
  it('should render lock button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const lock = getByTestId('lock');
    expect(lock).toBeDefined();
  });
});
