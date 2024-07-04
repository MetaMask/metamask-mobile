import React from 'react';
import { shallow } from 'enzyme';
import Settings from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { SettingsViewSelectorsIDs } from '../../../../e2e/selectors/Settings/SettingsView.selectors';
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
    const { toJSON } = render(
      <Provider store={store}>
        <Settings />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
  it('should render general settings button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const generalSettings = getByTestId(SettingsViewSelectorsIDs.GENERAL);
    expect(generalSettings).toBeDefined();
  });
  it('should render security settings button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const securitySettings = getByTestId(SettingsViewSelectorsIDs.SECURITY);
    expect(securitySettings).toBeDefined();
  });
  it('should render advanced settings button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const advancedSettings = getByTestId(SettingsViewSelectorsIDs.ADVANCED);
    expect(advancedSettings).toBeDefined();
  });
  it('should render contacts settings button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const contactsSettings = getByTestId(SettingsViewSelectorsIDs.CONTACTS);
    expect(contactsSettings).toBeDefined();
  });
  it('should render network settings button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const networksSettings = getByTestId(SettingsViewSelectorsIDs.NETWORKS);
    expect(networksSettings).toBeDefined();
  });
  it('should render feature request button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const onRampSettings = getByTestId(SettingsViewSelectorsIDs.ON_RAMP);
    expect(onRampSettings).toBeDefined();
  });
  it('should render experimental settings button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const experimentalSettings = getByTestId(
      SettingsViewSelectorsIDs.EXPERIMENTAL,
    );
    expect(experimentalSettings).toBeDefined();
  });
  it('should render about metamask button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const aboutMetamask = getByTestId(SettingsViewSelectorsIDs.ABOUT_METAMASK);
    expect(aboutMetamask).toBeDefined();
  });
  it('should render request feature button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const requestFeature = getByTestId(SettingsViewSelectorsIDs.REQUEST);
    expect(requestFeature).toBeDefined();
  });
  it('should render contact support button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const contactSupport = getByTestId(SettingsViewSelectorsIDs.CONTACT);
    expect(contactSupport).toBeDefined();
  });
  it('should render lock button', () => {
    const { getByTestId } = renderWithProvider(<Settings />);
    const lock = getByTestId(SettingsViewSelectorsIDs.LOCK);
    expect(lock).toBeDefined();
  });
});
