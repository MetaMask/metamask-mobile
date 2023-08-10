import React from 'react';
import { shallow } from 'enzyme';
import Settings from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import renderWithProvider from '../../../util/test/renderWithProvider';
import {
  ABOUT_METAMASK_SETTINGS,
  ADVANCED_SETTINGS,
  CONTACT_SETTINGS,
  CONTACTS_SETTINGS,
  EXPERIMENTAL_SETTINGS,
  GENERAL_SETTINGS,
  LOCK_SETTINGS,
  NETWORKS_SETTINGS,
  ON_RAMP_SETTINGS,
  REQUEST_SETTINGS,
  SECURITY_SETTINGS,
} from '../../../../wdio/screen-objects/testIDs/Screens/Settings.testIds';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

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
    backgroundState: initialBackgroundState,
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
    const generalSettings = getByTestId(GENERAL_SETTINGS);
    expect(generalSettings).toBeDefined();
  });
  it('should render security settings button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const securitySettings = getByTestId(SECURITY_SETTINGS);
    expect(securitySettings).toBeDefined();
  });
  it('should render advanced settings button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const advancedSettings = getByTestId(ADVANCED_SETTINGS);
    expect(advancedSettings).toBeDefined();
  });
  it('should render contacts settings button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const contactsSettings = getByTestId(CONTACTS_SETTINGS);
    expect(contactsSettings).toBeDefined();
  });
  it('should render network settings button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const networksSettings = getByTestId(NETWORKS_SETTINGS);
    expect(networksSettings).toBeDefined();
  });
  it('should render feature request button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const onRampSettings = getByTestId(ON_RAMP_SETTINGS);
    expect(onRampSettings).toBeDefined();
  });
  it('should render experimental settings button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const experimentalSettings = getByTestId(EXPERIMENTAL_SETTINGS);
    expect(experimentalSettings).toBeDefined();
  });
  it('should render about metamask button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const aboutMetamask = getByTestId(ABOUT_METAMASK_SETTINGS);
    expect(aboutMetamask).toBeDefined();
  });
  it('should render request feature button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const requestFeature = getByTestId(REQUEST_SETTINGS);
    expect(requestFeature).toBeDefined();
  });
  it('should render contact support button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const contactSupport = getByTestId(CONTACT_SETTINGS);
    expect(contactSupport).toBeDefined();
  });
  it('should render lock button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const lock = getByTestId(LOCK_SETTINGS);
    expect(lock).toBeDefined();
  });
});
