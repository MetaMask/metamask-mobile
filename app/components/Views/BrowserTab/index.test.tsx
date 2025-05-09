import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import BrowserTab from './BrowserTab';
import AppConstants from '../../../core/AppConstants';
import { isTokenDiscoveryBrowserEnabled } from '../../../util/browser';
import { screen, waitFor } from '@testing-library/react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { omit } from 'lodash';
import { BrowserViewSelectorsIDs } from '../../../../e2e/selectors/Browser/BrowserView.selectors';

const mockNavigation = {
  goBack: jest.fn(),
  goForward: jest.fn(),
  canGoBack: true,
  canGoForward: true,
  addListener: jest.fn(),
};

jest.mock('../../UI/BrowserBottomBar', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue('BrowserBottomBar'),
}));

jest.mock('../../UI/BrowserUrlBar', () => ({
  __esModule: true,
  ...jest.requireActual('../../UI/BrowserUrlBar'),
  default: jest.fn().mockReturnValue('BrowserUrlBar'),
}));

jest.mock('../../UI/UrlAutocomplete', () => ({
  __esModule: true,
  ...jest.requireActual('../../UI/UrlAutocomplete'),
  default: jest.fn().mockReturnValue('UrlAutocomplete'),
}));

jest.mock('../../../util/browser', () => ({
  ...jest.requireActual('../../../util/browser'),
  isTokenDiscoveryBrowserEnabled: jest.fn().mockReturnValue(false),
}));

jest.mock('../../../core/EntryScriptWeb3', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockReturnValue(Promise.resolve('EntryScriptWeb3')),
  },
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => mockNavigation,
    useIsFocused: () => true,
  };
});

const mockInitialState = {
  browser: {
    activeTab: 1,
    history: [],
    tabs: [
      {
        id: 1,
        url: 'https://metamask.io',
        image: '',
        isArchived: false,
      }
    ],
  },
  bookmarks: [],
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
  transaction: {
    selectedAsset: '',
  },
};

jest.mock('../../../core/Engine', () => ({
  context: {
    PhishingController: {
      maybeUpdateState: jest.fn(),
      test: () => ({ result: true, name: 'test' }),
    },
    CurrencyRateController: {
      updateExchangeRate: jest.fn(() => Promise.resolve()),
    },
  },
}));

const mockProps = {
  id: 1,
  defaultProtocol: 'https://',
  selectedAddress: '0x123',
  whitelist: [],
  bookmarks: [],
  searchEngine: 'Google',
  newTab: jest.fn(),
  addBookmark: jest.fn(),
  addToBrowserHistory: jest.fn(),
  addToWhitelist: jest.fn(),
  updateTabInfo: jest.fn(),
  showTabs: jest.fn(),
  wizardStep: 1,
  isIpfsGatewayEnabled: false,
  chainId: '0x1',
  isInTabsView: false,
  initialUrl: 'https://metamask.io',
  homePageUrl: AppConstants.HOMEPAGE_URL,
};

const Stack = createStackNavigator();

describe('BrowserTab', () => {

  it('should render correctly', async () => {
    renderWithProvider(
      <NavigationContainer independent>
        <Stack.Navigator>
          <Stack.Screen name="Browser">
            {() => <BrowserTab {...mockProps} />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>,
      { state: mockInitialState }
    );
    await waitFor(() => {
      expect(screen.getByTestId(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID)).toBeOnTheScreen();
    });
  });

  it('should render correctly when token discovery browser is enabled', () => {
    jest.mocked(isTokenDiscoveryBrowserEnabled).mockReturnValue(true);
    renderWithProvider(
      <NavigationContainer independent>
        <Stack.Navigator>
          <Stack.Screen name="Browser">
            {() => <BrowserTab {...omit(mockProps, 'initialUrl')} />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>,
      { state: mockInitialState }
    );
    expect(screen.getByText('Token Discovery placeholder')).toBeOnTheScreen();
    jest.mocked(isTokenDiscoveryBrowserEnabled).mockReturnValue(false);
  });
});
