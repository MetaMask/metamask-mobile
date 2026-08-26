// Browser component rendering and initialization tests
// Split from index.test.tsx to prevent React Testing Library state pollution
// write unit test so that browser/index.js->newTab()
// 1. if tabs.length > 4, show the max browser tabs modal
// 2. if tabs.length <= 4, create a new tab

import React from 'react';
import { BrowserPure as BrowserComponent } from './index';
import Routes from '../../../constants/navigation/Routes';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';

import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { IndependentNavigationContainer } from '../../../util/test/IndependentNavigationContainer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { isTokenDiscoveryBrowserEnabled } from '../../../util/browser';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { useAccounts } from '../../hooks/useAccounts';
import {
  getPermittedCaipAccountIdsByHostname,
  sortMultichainAccountsByLastSelected,
} from '../../../core/Permissions';
import { KeyringTypes } from '@metamask/keyring-controller';
import { parseCaipAccountId } from '@metamask/utils';
import { toast } from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import BrowserTab from '../BrowserTab/BrowserTab';

const Browser = BrowserComponent as React.ComponentType<
  Record<string, unknown>
>;

jest.useFakeTimers();

jest.mock('../../hooks/useAccounts', () => ({
  useAccounts: jest.fn().mockReturnValue({
    evmAccounts: [],
    accounts: [],
    ensByAccountAddress: {},
  }),
}));

jest.mock('../../../core/Permissions', () => ({
  // Mock specific named exports. Add others if Browser.js uses them.
  getPermittedCaipAccountIdsByHostname: jest.fn(),
  sortMultichainAccountsByLastSelected: jest.fn(),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    toast: Object.assign(jest.fn(), { dismiss: jest.fn() }),
  };
});

jest.mock('../BrowserTab/BrowserTab', () => ({
  __esModule: true,
  default: jest.fn(() => 'BrowserTab'),
}));

jest.mock('../../UI/Tabs/TabThumbnail/TabThumbnail', () => ({
  __esModule: true,
  default: jest.fn(() => 'TabThumbnail'),
}));

jest.mock('../../UI/Tabs', () => ({
  __esModule: true,
  default: jest.fn((props) => {
    // Store props for testing
    if (props?.closeTabsView) {
      // Allow testing closeTabsView by exposing it
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (jest as any).__tabsCloseTabsView = props.closeTabsView;
    }
    return 'Tabs';
  }),
}));

const mockTabs = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  url: 'about:blank',
  image: '',
  isArchived: false,
  lastActiveAt: Date.now() - i * 1000,
}));

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      BrowserController: { tabs: mockTabs },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
  security: {},
  settings: {
    showFiatOnTestnets: true,
    primaryCurrency: 'ETH',
    basicFunctionalityEnabled: true,
  },
  browser: {
    tabs: mockTabs,
    activeTab: 1,
  },
};

jest.mock('../../../core/Engine', () => {
  const { MOCK_ACCOUNTS_CONTROLLER_STATE: mockAccountsControllerState } =
    jest.requireActual('../../../util/test/accountsControllerTestUtils');
  return {
    context: {
      PhishingController: {
        maybeUpdateState: jest.fn(),
        test: jest.fn((url: string) => {
          if (url === 'phishing.com') return { result: true };
          return { result: false };
        }),
      },
      AccountsController: mockAccountsControllerState,
      PermissionsController: {
        getCaveat: jest.fn(), // Default mock, can be configured in tests
        getPermittedAccountsByHostname: jest.fn(),
      },
    },
  };
});

jest.mock('../../../util/phishingDetection', () => ({
  getPhishingTestResultAsync: jest.fn().mockResolvedValue({ result: false }),
}));

jest.mock('../../../util/browser', () => ({
  ...jest.requireActual('../../../util/browser'),
  isTokenDiscoveryBrowserEnabled: jest.fn().mockReturnValue(false),
}));

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
}));

jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('react-native-view-shot', () => ({
  captureScreen: jest.fn(),
}));

jest.mock('../DiscoveryTab/DiscoveryTab', () => ({
  __esModule: true,
  default: jest.fn(() => 'DiscoveryTab'),
}));

jest.mock('../../hooks/useBuildPortfolioUrl', () => ({
  useBuildPortfolioUrl: jest.fn(() => () => ({
    href: 'https://home.metamask.io',
  })),
}));

jest.mock('../../../util/Logger', () => ({
  error: jest.fn(),
}));

const Stack = createNativeStackNavigator();
const mockStore = configureMockStore();

const routeMock = {
  params: {},
};

const mockNavigation = {
  setOptions: jest.fn(),
  setParams: jest.fn(),
  navigate: jest.fn(),
  goBack: jest.fn(),
};

const mockGetPermittedCaipAccountIdsByHostname =
  getPermittedCaipAccountIdsByHostname as jest.Mock;
const mockSortMultichainAccountsByLastSelected =
  sortMultichainAccountsByLastSelected as jest.Mock;

describe('Browser - Rendering and Initialization', () => {
  it('renders Browser component', () => {
    renderWithProvider(
      <Provider store={mockStore(mockInitialState)}>
        <ThemeContext.Provider value={mockTheme}>
          <IndependentNavigationContainer>
            <Stack.Navigator>
              <Stack.Screen name={Routes.BROWSER.VIEW}>
                {() => (
                  <Browser
                    route={routeMock}
                    tabs={mockTabs}
                    activeTab={1}
                    navigation={mockNavigation}
                    createNewTab={jest.fn}
                    closeTab={jest.fn}
                    setActiveTab={jest.fn}
                    updateTab={jest.fn}
                  />
                )}
              </Stack.Screen>
            </Stack.Navigator>
          </IndependentNavigationContainer>
        </ThemeContext.Provider>
      </Provider>,
      { state: { ...mockInitialState } },
    );
    expect(BrowserTab).toHaveBeenCalled();
  });

  it('creates a new homepage tab when rendered with no tabs', () => {
    let passedUrl = '';
    const mockCreateNewTab = jest.fn((url) => {
      passedUrl = url;
    });
    renderWithProvider(
      <Provider store={mockStore(mockInitialState)}>
        <IndependentNavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name={Routes.BROWSER.VIEW}>
              {() => (
                <Browser
                  route={routeMock}
                  tabs={[]}
                  activeTab={1}
                  navigation={mockNavigation}
                  createNewTab={mockCreateNewTab}
                  closeTab={jest.fn}
                  setActiveTab={jest.fn}
                  updateTab={jest.fn}
                />
              )}
            </Stack.Screen>
          </Stack.Navigator>
        </IndependentNavigationContainer>
      </Provider>,
      { state: { ...mockInitialState } },
    );

    expect(mockCreateNewTab).toHaveBeenCalled();
    expect(passedUrl).toMatch(/^https:\/\//);
  });

  it('creates a new token discovery tab when rendered with no tabs and token discovery browser is enabled', () => {
    jest.mocked(isTokenDiscoveryBrowserEnabled).mockReturnValue(true);
    const mockCreateNewTab = jest.fn();
    renderWithProvider(
      <Provider store={mockStore(mockInitialState)}>
        <IndependentNavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name={Routes.BROWSER.VIEW}>
              {() => (
                <Browser
                  route={routeMock}
                  tabs={[]}
                  activeTab={1}
                  navigation={mockNavigation}
                  createNewTab={mockCreateNewTab}
                  closeTab={jest.fn}
                  setActiveTab={jest.fn}
                  updateTab={jest.fn}
                />
              )}
            </Stack.Screen>
          </Stack.Navigator>
        </IndependentNavigationContainer>
      </Provider>,
      { state: { ...mockInitialState } },
    );

    expect(mockCreateNewTab).toHaveBeenCalledWith(undefined, undefined);
    jest.mocked(isTokenDiscoveryBrowserEnabled).mockReturnValue(false);
  });

  it('calls navigate when route param `newTabUrl` and `timestamp` are added', () => {
    // Render the component with an initial prop value
    const { rerender } = renderWithProvider(
      <Provider store={mockStore(mockInitialState)}>
        <IndependentNavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name={Routes.BROWSER.VIEW}>
              {() => (
                <Browser
                  route={routeMock}
                  tabs={[]}
                  activeTab={1}
                  navigation={mockNavigation}
                  createNewTab={jest.fn}
                  closeTab={jest.fn}
                  setActiveTab={jest.fn}
                  updateTab={jest.fn}
                />
              )}
            </Stack.Screen>
          </Stack.Navigator>
        </IndependentNavigationContainer>
      </Provider>,
      { state: { ...mockInitialState } },
    );

    const navigationSpy = jest.spyOn(mockNavigation, 'navigate');

    // rerender with a different route value
    rerender(
      <Provider store={mockStore(mockInitialState)}>
        <IndependentNavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name={Routes.BROWSER.VIEW}>
              {() => (
                <Browser
                  route={{
                    params: { newTabUrl: 'about:blank', timestamp: '987' },
                  }}
                  tabs={mockTabs}
                  activeTab={1}
                  navigation={mockNavigation}
                  createNewTab={jest.fn}
                  closeTab={jest.fn}
                  setActiveTab={jest.fn}
                  updateTab={jest.fn}
                />
              )}
            </Stack.Screen>
          </Stack.Navigator>
        </IndependentNavigationContainer>
      </Provider>,
    );
    // Check if navigate was called to show the modal
    expect(navigationSpy).toHaveBeenCalledWith(
      Routes.MODAL.MAX_BROWSER_TABS_MODAL,
    );

    // Clean up the spy
    navigationSpy.mockRestore();
  });

  it('opens URL in active tab when max tabs reached and fromTrending is true', () => {
    const mockUpdateTab = jest.fn();
    const mockCreateNewTab = jest.fn();

    const { rerender } = renderWithProvider(
      <Provider store={mockStore(mockInitialState)}>
        <IndependentNavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name={Routes.BROWSER.VIEW}>
              {() => (
                <Browser
                  route={routeMock}
                  tabs={mockTabs}
                  activeTab={1}
                  navigation={mockNavigation}
                  createNewTab={mockCreateNewTab}
                  closeTab={jest.fn}
                  setActiveTab={jest.fn}
                  updateTab={mockUpdateTab}
                />
              )}
            </Stack.Screen>
          </Stack.Navigator>
        </IndependentNavigationContainer>
      </Provider>,
      { state: { ...mockInitialState } },
    );

    const newSiteUrl = 'https://example.com';
    const navigationSpy = jest.spyOn(mockNavigation, 'navigate');

    // rerender with a new URL when max tabs are reached, coming from Explore (fromTrending)
    rerender(
      <Provider store={mockStore(mockInitialState)}>
        <IndependentNavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name={Routes.BROWSER.VIEW}>
              {() => (
                <Browser
                  route={{
                    params: {
                      newTabUrl: newSiteUrl,
                      timestamp: Date.now(),
                      fromTrending: true,
                    },
                  }}
                  tabs={mockTabs}
                  activeTab={1}
                  navigation={mockNavigation}
                  createNewTab={mockCreateNewTab}
                  closeTab={jest.fn}
                  setActiveTab={jest.fn}
                  updateTab={mockUpdateTab}
                />
              )}
            </Stack.Screen>
          </Stack.Navigator>
        </IndependentNavigationContainer>
      </Provider>,
    );

    // Does not navigate to the max browser tabs modal
    expect(navigationSpy).not.toHaveBeenCalled();

    // Does not create a new tab
    expect(mockCreateNewTab).not.toHaveBeenCalled();

    // Updates the active tab with the new URL
    expect(mockUpdateTab).toHaveBeenCalledWith(1, {
      url: newSiteUrl,
    });

    navigationSpy.mockRestore();
  });

  it('shows active account toast when visiting a site with permitted accounts', () => {
    // 1. Mock dependencies
    const testAccountAddress = '0xabcdef123456789';
    const oldHostname = 'site1.com';
    const newHostname = 'site2.com';
    const mockAccountName = 'Test Account';
    const caipAccountId = `eip155:0:${testAccountAddress}`;

    // Mock accounts and ENS data
    const mockAccounts = [
      {
        address: testAccountAddress,
        name: mockAccountName,
        type: KeyringTypes.simple,
        yOffset: 0,
        isSelected: true,
        caipAccountId,
      },
    ];
    const mockEnsByAccountAddress = {
      [testAccountAddress]: 'test.eth',
    };

    // Setup mocks
    (useAccounts as jest.Mock).mockReturnValue({
      evmAccounts: mockAccounts,
      accounts: mockAccounts,
      ensByAccountAddress: mockEnsByAccountAddress,
    });

    mockGetPermittedCaipAccountIdsByHostname.mockImplementation(
      (_, hostname) => {
        if (hostname === newHostname) {
          return [testAccountAddress];
        }
        return [];
      },
    );

    mockSortMultichainAccountsByLastSelected.mockImplementation(
      (permittedAccounts) =>
        permittedAccounts.length > 0 ? [caipAccountId] : [],
    );

    // Mock the checkIfActiveAccountChanged effect function
    // This is extracted from the useEffect in Browser.js
    const checkIfActiveAccountChanged = (hostname: string) => {
      const permittedAccounts = getPermittedCaipAccountIdsByHostname(
        [],
        hostname,
      );

      const sortedPermittedAccounts =
        sortMultichainAccountsByLastSelected(permittedAccounts);

      if (!sortedPermittedAccounts.length) {
        return false;
      }

      const activeCaipAccountId = sortedPermittedAccounts[0];
      const { address } = parseCaipAccountId(activeCaipAccountId);

      const accountName =
        address === testAccountAddress ? mockAccountName : 'Unknown Account';

      // Show toast - this is what we want to test
      toast({
        title: `${accountName} ${strings('toast.now_active')}`,
        showCloseButton: false,
      });

      return true;
    };

    // Verify toast is not shown initially for site1
    const prevHostnameResult = checkIfActiveAccountChanged(oldHostname);
    expect(prevHostnameResult).toBe(false);
    expect(toast).not.toHaveBeenCalled();

    // Verify toast is shown when changing to site2
    (toast as jest.Mock).mockReset();
    const newHostnameResult = checkIfActiveAccountChanged(newHostname);
    expect(newHostnameResult).toBe(true);
    expect(toast).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: `${mockAccountName} ${strings('toast.now_active')}`,
        showCloseButton: false,
      }),
    );
  });

  describe('useEffect for active account toast', () => {
    const testAccountAddress1 = '0x123';
    const testAccountAddress2 = '0x456';
    const mockAccountName1 = 'Account 1';
    const mockAccountName2 = 'Account 2';

    const mockAccounts = [
      {
        address: testAccountAddress1,
        name: mockAccountName1,
        type: KeyringTypes.simple,
        yOffset: 0,
        isSelected: true,
        caipAccountId: `eip155:0:${testAccountAddress1}`,
      },
      {
        address: testAccountAddress2,
        name: mockAccountName2,
        type: KeyringTypes.simple,
        yOffset: 0,
        isSelected: false,
        caipAccountId: `eip155:0:${testAccountAddress2}`,
      },
    ];
    const mockEnsByAccountAddress = {
      [testAccountAddress1]: 'account1.eth',
      [testAccountAddress2]: 'account2.eth',
    };

    const defaultBrowserProps = {
      navigation: mockNavigation,
      createNewTab: jest.fn(),
      closeTab: jest.fn(),
      setActiveTab: jest.fn(),
      updateTab: jest.fn(),
      tabs: [
        { id: 1, url: 'https://initial.com', image: '', isArchived: false },
      ],
      activeTab: 1,
    };

    const browserTree = (
      props: Partial<React.ComponentProps<typeof Browser>>,
    ) => (
      <Provider store={mockStore(mockInitialState)}>
        <ThemeContext.Provider value={mockTheme}>
          <IndependentNavigationContainer>
            <Stack.Navigator>
              <Stack.Screen name={Routes.BROWSER.VIEW}>
                {() => <Browser {...defaultBrowserProps} {...props} />}
              </Stack.Screen>
            </Stack.Navigator>
          </IndependentNavigationContainer>
        </ThemeContext.Provider>
      </Provider>
    );

    const renderBrowserWithProps = (
      props: Partial<React.ComponentProps<typeof Browser>>,
    ) =>
      renderWithProvider(browserTree(props), {
        state: {
          ...mockInitialState,
          browser: {
            tabs: props.tabs || defaultBrowserProps.tabs,
            activeTab: props.activeTab || defaultBrowserProps.activeTab,
          },
        },
      });

    beforeEach(() => {
      jest.clearAllMocks();
      (useAccounts as jest.Mock).mockReturnValue({
        evmAccounts: mockAccounts,
        accounts: mockAccounts,
        ensByAccountAddress: mockEnsByAccountAddress,
      });
    });

    it('shows toast when url changes to a new host with a permitted account', () => {
      mockGetPermittedCaipAccountIdsByHostname.mockImplementation(
        (_, hostname) =>
          hostname === 'newsite.com' ? [testAccountAddress1] : [],
      );

      mockSortMultichainAccountsByLastSelected.mockImplementation(
        (permittedAccounts) =>
          permittedAccounts.length > 0
            ? [`eip155:0:${testAccountAddress1}`]
            : [],
      );

      const { rerender } = renderBrowserWithProps({
        route: { params: { url: 'https://initial.com' } },
      });

      expect(toast).not.toHaveBeenCalled(); // No toast on initial render for initial.com

      rerender(
        browserTree({
          route: { params: { url: 'https://newsite.com' } },
        }),
      );

      expect(toast).toHaveBeenCalledTimes(1);
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining(
            mockEnsByAccountAddress[testAccountAddress1],
          ),
          showCloseButton: false,
        }),
      );
    });

    it('shows toast when accounts become available for the current host', () => {
      mockGetPermittedCaipAccountIdsByHostname.mockReturnValue([
        testAccountAddress1,
      ]);

      mockSortMultichainAccountsByLastSelected.mockReturnValue([
        `eip155:0:${testAccountAddress1}`,
      ]);

      // Initial render with no accounts
      (useAccounts as jest.Mock).mockReturnValue({
        evmAccounts: [],
        accounts: [],
        ensByAccountAddress: {},
      });

      const { rerender } = renderBrowserWithProps({
        route: { params: { url: 'https://currentsite.com' } },
      });
      expect(toast).not.toHaveBeenCalled();

      // Rerender with accounts
      (useAccounts as jest.Mock).mockReturnValue({
        evmAccounts: mockAccounts,
        accounts: mockAccounts,
        ensByAccountAddress: mockEnsByAccountAddress,
      });

      rerender(
        browserTree({
          route: { params: { url: 'https://currentsite.com' } },
        }),
      );

      expect(toast).toHaveBeenCalledTimes(1);
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining(
            mockEnsByAccountAddress[testAccountAddress1],
          ),
          showCloseButton: false,
        }),
      );
    });

    it('does not show toast when host changes but no permitted accounts for new host', () => {
      mockGetPermittedCaipAccountIdsByHostname.mockImplementation(
        (_, hostname) =>
          hostname === 'initial.com' ? [testAccountAddress1] : [],
      );

      mockSortMultichainAccountsByLastSelected.mockImplementation(
        (permittedAccounts) =>
          permittedAccounts.length > 0
            ? [`eip155:0:${testAccountAddress1}`]
            : [],
      );

      const { rerender } = renderBrowserWithProps({
        route: { params: { url: 'https://initial.com' } },
      });
      // Toast for initial.com
      expect(toast).toHaveBeenCalledTimes(1);
      (toast as jest.Mock).mockClear();

      rerender(
        browserTree({
          route: { params: { url: 'https://anothernewsite.com' } },
        }),
      );

      expect(toast).not.toHaveBeenCalled();
    });

    it('does not show toast when already on the same host with permitted accounts', () => {
      mockGetPermittedCaipAccountIdsByHostname.mockReturnValue([
        testAccountAddress1,
      ]);

      mockSortMultichainAccountsByLastSelected.mockReturnValue([
        `eip155:0:${testAccountAddress1}`,
      ]);

      const { rerender } = renderBrowserWithProps({
        route: { params: { url: 'https://samesite.com' } },
      });
      expect(toast).toHaveBeenCalledTimes(1); // Initial toast
      (toast as jest.Mock).mockClear();

      // Rerender with same URL (e.g., due to some other state change not affecting URL or accounts)
      rerender(
        browserTree({
          route: { params: { url: 'https://samesite.com' } },
        }),
      );
      expect(toast).not.toHaveBeenCalled();
    });

    it('does not show toast when there are no accounts', () => {
      (useAccounts as jest.Mock).mockReturnValue({
        evmAccounts: [],
        accounts: [],
        ensByAccountAddress: {},
      });
      mockGetPermittedCaipAccountIdsByHostname.mockReturnValue([
        testAccountAddress1,
      ]);

      mockSortMultichainAccountsByLastSelected.mockReturnValue([
        `eip155:0:${testAccountAddress1}`,
      ]);

      renderBrowserWithProps({
        route: { params: { url: 'https://anyvalidurl.com' } },
      });

      expect(toast).not.toHaveBeenCalled();
    });

    it('does not show toast when effectiveUrl is null or undefined', () => {
      // Ensure getPermittedCaipAccountIdsByHostname only returns accounts for a specific, non-null hostname
      mockGetPermittedCaipAccountIdsByHostname.mockImplementation(
        (_, hostname) =>
          hostname === 'somevalidhost.com' ? [testAccountAddress1] : [],
      );

      mockSortMultichainAccountsByLastSelected.mockImplementation(
        (permittedAccounts) =>
          permittedAccounts.length > 0
            ? [`eip155:0:${testAccountAddress1}`]
            : [],
      );
      renderBrowserWithProps({
        route: { params: { url: null } }, // browserUrl will be null
        tabs: [{ id: 1, url: null, image: '', isArchived: false }], // currentUrl might become homePageUrl initially
      });
      expect(toast).not.toHaveBeenCalled();
    });

    it('uses browserUrl from props when currentUrl is not set initially', () => {
      mockGetPermittedCaipAccountIdsByHostname.mockImplementation(
        (_, hostname) =>
          hostname === 'propurl.com' ? [testAccountAddress1] : [],
      );

      mockSortMultichainAccountsByLastSelected.mockImplementation(
        (permittedAccounts) =>
          permittedAccounts.length > 0
            ? [`eip155:0:${testAccountAddress1}`]
            : [],
      );

      renderBrowserWithProps({
        route: { params: {} }, // No URL in route.params, so currentUrl is initially AppConstants.HOMEPAGE_URL
        // Browser component will receive props.browserUrl via route.params.url
        // We are testing the case where currentUrl is not set via route.params.url initially and it defaults to homePageUrl
        // and then a new browserUrl prop is passed
      });
      expect(toast).not.toHaveBeenCalled(); // homePageUrl likely won't have permitted accounts

      // Simulate a new navigation where browserUrl is passed directly in route.params
      /* const { rerender } = */ renderBrowserWithProps({
        route: { params: { url: 'https://propurl.com' } },
      });

      expect(toast).toHaveBeenCalledTimes(1);
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining(
            mockEnsByAccountAddress[testAccountAddress1],
          ),
        }),
      );
    });
  });
});
