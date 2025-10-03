import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { screen, waitFor } from '@testing-library/react-native';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import BrowserTab from './BrowserTab';
import AppConstants from '../../../core/AppConstants';

const mockNavigation = {
  goBack: jest.fn(),
  goForward: jest.fn(),
  canGoBack: true,
  canGoForward: true,
  addListener: jest.fn(),
  navigate: jest.fn(),
};

const mockRoute = {
  params: { url: '' },
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => mockNavigation,
    useIsFocused: () => true,
    useRoute: () => mockRoute,
  };
});

// Mock react-native-device-info to provide a valid version string
jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '7.0.0'),
}));

const mockInitialState = {
  browser: {
    activeTab: 1,
    history: [],
    whitelist: [],
    tabs: [],
    favicons: [],
    visitedDappsByHostname: {},
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

jest.mock('../../../core/Engine', () => ({
  context: {
    PhishingController: {
      maybeUpdateState: jest.fn(),
      test: () => ({ result: true, name: 'test' }),
    },
    AccountsController: {
      listMultichainAccounts: () => [],
    },
    CurrencyRateController: {
      updateExchangeRate: jest.fn(),
    },
  },
}));

jest.mock('../../../core/EntryScriptWeb3', () => ({
  init: jest.fn(),
  get: () => '',
}));

const mockProps = {
  id: 1,
  activeTab: 1,
  defaultProtocol: 'https://',
  searchEngine: 'Google',
  newTab: jest.fn(),
  addBookmark: jest.fn(),
  updateTabInfo: jest.fn(),
  showTabs: jest.fn(),
  isInTabsView: false,
  initialUrl: 'https://metamask.io',
  homePageUrl: AppConstants.HOMEPAGE_URL,
};

describe('BrowserTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render Browser', async () => {
    renderWithProvider(<BrowserTab {...mockProps} />, {
      state: mockInitialState,
    });
    await waitFor(() =>
      expect(screen.getByTestId('browser-webview')).toBeVisible(),
    );

    expect(screen.toJSON()).toMatchSnapshot();
  });
});
