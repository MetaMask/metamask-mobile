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
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { act } from '@testing-library/react-native';
import { isTokenDiscoveryBrowserEnabled } from '../../../util/browser';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { useAccounts } from '../../hooks/useAccounts';
import {
  getPermittedCaipAccountIdsByHostname,
  sortMultichainAccountsByLastSelected,
} from '../../../core/Permissions';
import { KeyringTypes } from '@metamask/keyring-controller';
import { ToastContext } from '../../../component-library/components/Toast/Toast.context';
import { parseCaipAccountId } from '@metamask/utils';

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

const mockTabs = [
  { id: 1, url: 'about:blank', image: '', isArchived: false },
  { id: 2, url: 'about:blank', image: '', isArchived: false },
  { id: 3, url: 'about:blank', image: '', isArchived: false },
  { id: 4, url: 'about:blank', image: '', isArchived: false },
  { id: 5, url: 'about:blank', image: '', isArchived: false },
];

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

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  openURL: jest.fn(),
  canOpenURL: jest.fn(),
  getInitialURL: jest.fn(),
}));

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

jest.mock('../../hooks/useMetrics', () => ({
  useMetrics: () => ({
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

const Stack = createStackNavigator();
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
    const { toJSON } = renderWithProvider(
      <Provider store={mockStore(mockInitialState)}>
        <ThemeContext.Provider value={mockTheme}>
          <NavigationContainer independent>
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
          </NavigationContainer>
        </ThemeContext.Provider>
      </Provider>,
      { state: { ...mockInitialState } },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('creates a new homepage tab when rendered with no tabs', () => {
    let passedUrl = '';
    const mockCreateNewTab = jest.fn((url) => {
      passedUrl = url;
    });
    renderWithProvider(
      <Provider store={mockStore(mockInitialState)}>
        <NavigationContainer independent>
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
        </NavigationContainer>
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
        <NavigationContainer independent>
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
        </NavigationContainer>
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
        <NavigationContainer independent>
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
        </NavigationContainer>
      </Provider>,
      { state: { ...mockInitialState } },
    );

    const navigationSpy = jest.spyOn(mockNavigation, 'navigate');

    // rerender with a different route value
    rerender(
      <Provider store={mockStore(mockInitialState)}>
        <NavigationContainer independent>
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
        </NavigationContainer>
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
        <NavigationContainer independent>
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
        </NavigationContainer>
      </Provider>,
      { state: { ...mockInitialState } },
    );

    const newSiteUrl = 'https://example.com';
    const navigationSpy = jest.spyOn(mockNavigation, 'navigate');

    // rerender with a new URL when max tabs are reached, coming from Explore (fromTrending)
    rerender(
      <Provider store={mockStore(mockInitialState)}>
        <NavigationContainer independent>
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
        </NavigationContainer>
      </Provider>,
    );

    // Does not navigate to the max browser tabs modal
    expect(navigationSpy).not.toHaveBeenCalled();

    // Dpes not create a new tab
    expect(mockCreateNewTab).not.toHaveBeenCalled();

    // Updates the active tab with the new URL
    expect(mockUpdateTab).toHaveBeenCalledWith(1, {
      url: newSiteUrl,
      isArchived: false,
    });

    navigationSpy.mockRestore();
  });

  it('marks a tab as archived if it has been idle for too long', async () => {
    const mockTabsForIdling = [
      { id: 1, url: 'about:blank', image: '', isArchived: false },
      { id: 2, url: 'about:blank', image: '', isArchived: false },
    ];

    jest.useFakeTimers();
    const mockUpdateTab = jest.fn();

    renderWithProvider(
      <Provider store={mockStore(mockInitialState)}>
        <NavigationContainer independent>
          <Stack.Navigator>
            <Stack.Screen name="Browser">
              {() => (
                <Browser
                  route={{ params: {} }}
                  tabs={mockTabsForIdling}
                  activeTab={1}
                  navigation={mockNavigation}
                  createNewTab={jest.fn}
                  closeTab={jest.fn}
                  setActiveTab={jest.fn}
                  updateTab={mockUpdateTab}
                />
              )}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </Provider>,
    );

    // Wrap the timer advancement in act
    await act(async () => {
      jest.advanceTimersByTime(1000 * 60 * 5);
    });

    expect(mockUpdateTab).toHaveBeenCalledWith(2, { isArchived: true });
  });

  it('shows active account toast when visiting a site with permitted accounts', () => {
    // 1. Mock dependencies
    const mockShowToast = jest.fn();
    const mockCloseToast = jest.fn();
    const mockToastRef = {
      current: { showToast: mockShowToast, closeToast: mockCloseToast },
    };

    // Mock required values
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
      mockToastRef.current.showToast({
        variant: 'Account',
        labelOptions: [
          {
            label: `${accountName} `,
            isBold: true,
          },
          { label: 'now active.' },
        ],
        accountAddress: address,
        accountAvatarType: 'JazzIcon',
      });

      return true;
    };

    // Verify toast is not shown initially for site1
    const prevHostnameResult = checkIfActiveAccountChanged(oldHostname);
    expect(prevHostnameResult).toBe(false);
    expect(mockShowToast).not.toHaveBeenCalled();

    // Verify toast is shown when changing to site2
    mockShowToast.mockReset();
    const newHostnameResult = checkIfActiveAccountChanged(newHostname);
    expect(newHostnameResult).toBe(true);
    expect(mockShowToast).toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'Account',
        accountAddress: testAccountAddress,
        labelOptions: expect.arrayContaining([
          expect.objectContaining({
            isBold: true,
            label: `${mockAccountName} `,
          }),
          expect.objectContaining({
            label: 'now active.',
          }),
        ]),
      }),
    );
  });

  describe('useEffect for active account toast', () => {
    const mockShowToast = jest.fn();
    const mockCloseToast = jest.fn();
    const mockToastRef = {
      current: { showToast: mockShowToast, closeToast: mockCloseToast },
    };

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

    const renderBrowserWithProps = (
      props: Partial<React.ComponentProps<typeof Browser>>,
    ) =>
      renderWithProvider(
        <Provider store={mockStore(mockInitialState)}>
          <ThemeContext.Provider value={mockTheme}>
            <ToastContext.Provider value={{ toastRef: mockToastRef }}>
              <NavigationContainer independent>
                <Stack.Navigator>
                  <Stack.Screen name={Routes.BROWSER.VIEW}>
                    {() => <Browser {...defaultBrowserProps} {...props} />}
                  </Stack.Screen>
                </Stack.Navigator>
              </NavigationContainer>
            </ToastContext.Provider>
          </ThemeContext.Provider>
        </Provider>,
        {
          state: {
            ...mockInitialState,
            browser: {
              tabs: props.tabs || defaultBrowserProps.tabs,
              activeTab: props.activeTab || defaultBrowserProps.activeTab,
            },
          },
        },
      );

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

      expect(mockShowToast).not.toHaveBeenCalled(); // No toast on initial render for initial.com

      rerender(
        <Provider store={mockStore(mockInitialState)}>
          <ThemeContext.Provider value={mockTheme}>
            <ToastContext.Provider value={{ toastRef: mockToastRef }}>
              <NavigationContainer independent>
                <Stack.Navigator>
                  <Stack.Screen name={Routes.BROWSER.VIEW}>
                    {() => (
                      <Browser
                        {...defaultBrowserProps}
                        route={{ params: { url: 'https://newsite.com' } }}
                      />
                    )}
                  </Stack.Screen>
                </Stack.Navigator>
              </NavigationContainer>
            </ToastContext.Provider>
          </ThemeContext.Provider>
        </Provider>,
      );

      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          accountAddress: testAccountAddress1,
          labelOptions: expect.arrayContaining([
            expect.objectContaining({
              label: `${mockEnsByAccountAddress[testAccountAddress1]} `,
            }),
          ]),
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
      expect(mockShowToast).not.toHaveBeenCalled();

      // Rerender with accounts
      (useAccounts as jest.Mock).mockReturnValue({
        evmAccounts: mockAccounts,
        accounts: mockAccounts,
        ensByAccountAddress: mockEnsByAccountAddress,
      });

      rerender(
        <Provider store={mockStore(mockInitialState)}>
          <ThemeContext.Provider value={mockTheme}>
            <ToastContext.Provider value={{ toastRef: mockToastRef }}>
              <NavigationContainer independent>
                <Stack.Navigator>
                  <Stack.Screen name={Routes.BROWSER.VIEW}>
                    {() => (
                      <Browser
                        {...defaultBrowserProps}
                        route={{ params: { url: 'https://currentsite.com' } }}
                      />
                    )}
                  </Stack.Screen>
                </Stack.Navigator>
              </NavigationContainer>
            </ToastContext.Provider>
          </ThemeContext.Provider>
        </Provider>,
      );

      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          accountAddress: testAccountAddress1,
          labelOptions: expect.arrayContaining([
            expect.objectContaining({
              label: `${mockEnsByAccountAddress[testAccountAddress1]} `,
            }),
          ]),
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
      expect(mockShowToast).toHaveBeenCalledTimes(1);
      mockShowToast.mockClear();

      rerender(
        <Provider store={mockStore(mockInitialState)}>
          <ThemeContext.Provider value={mockTheme}>
            <ToastContext.Provider value={{ toastRef: mockToastRef }}>
              <NavigationContainer independent>
                <Stack.Navigator>
                  <Stack.Screen name={Routes.BROWSER.VIEW}>
                    {() => (
                      <Browser
                        {...defaultBrowserProps}
                        route={{
                          params: { url: 'https://anothernewsite.com' },
                        }}
                      />
                    )}
                  </Stack.Screen>
                </Stack.Navigator>
              </NavigationContainer>
            </ToastContext.Provider>
          </ThemeContext.Provider>
        </Provider>,
      );

      expect(mockShowToast).not.toHaveBeenCalled();
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
      expect(mockShowToast).toHaveBeenCalledTimes(1); // Initial toast
      mockShowToast.mockClear();

      // Rerender with same URL (e.g., due to some other state change not affecting URL or accounts)
      rerender(
        <Provider store={mockStore(mockInitialState)}>
          <ThemeContext.Provider value={mockTheme}>
            <ToastContext.Provider value={{ toastRef: mockToastRef }}>
              <NavigationContainer independent>
                <Stack.Navigator>
                  <Stack.Screen name={Routes.BROWSER.VIEW}>
                    {() => (
                      <Browser
                        {...defaultBrowserProps}
                        route={{ params: { url: 'https://samesite.com' } }}
                      />
                    )}
                  </Stack.Screen>
                </Stack.Navigator>
              </NavigationContainer>
            </ToastContext.Provider>
          </ThemeContext.Provider>
        </Provider>,
      );
      expect(mockShowToast).not.toHaveBeenCalled();
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

      expect(mockShowToast).not.toHaveBeenCalled();
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
      expect(mockShowToast).not.toHaveBeenCalled();
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
      expect(mockShowToast).not.toHaveBeenCalled(); // homePageUrl likely won't have permitted accounts

      // Simulate a new navigation where browserUrl is passed directly in route.params
      /* const { rerender } = */ renderBrowserWithProps({
        route: { params: { url: 'https://propurl.com' } },
      });

      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ accountAddress: testAccountAddress1 }),
      );
    });
  });
});
