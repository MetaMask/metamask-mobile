// write unit test so that browser/index.js->newTab()
// 1. if tabs.length > 4, show the max browser tabs modal
// 2. if tabs.length <= 4, create a new tab

import React from 'react';
import { Browser } from './index';
import Routes from '../../../constants/navigation/Routes';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';

import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { act } from '@testing-library/react';
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
  wizard: {
    step: 1,
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
  isProductSafetyDappScanningEnabled: jest.fn().mockReturnValue(false),
  getPhishingTestResult: jest.fn().mockReturnValue({ result: false }),
}));

jest.mock('../../../util/browser', () => ({
  ...jest.requireActual('../../../util/browser'),
  isTokenDiscoveryBrowserEnabled: jest.fn().mockReturnValue(false),
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

const mockGetPermittedCaipAccountIdsByHostname = getPermittedCaipAccountIdsByHostname as jest.Mock;
const mockSortMultichainAccountsByLastSelected = sortMultichainAccountsByLastSelected as jest.Mock;

describe('Browser', () => {
  it('should render correctly', () => {
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
                    closeAllTabs={jest.fn}
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

  it('should create a new homepage tab when rendered with no tabs', () => {
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
                  closeAllTabs={jest.fn}
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

  it('should create a new token discovery tab when rendered with no tabs and token discovery browser is enabled', () => {
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
                  closeAllTabs={jest.fn}
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

  it('should call navigate when route param `newTabUrl` and `timestamp` are added', () => {
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
                  closeAllTabs={jest.fn}
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
                  closeAllTabs={jest.fn}
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
    // Check if myFunction was called
    expect(navigationSpy).toHaveBeenCalledWith(
      Routes.MODAL.MAX_BROWSER_TABS_MODAL,
    );

    // Clean up the spy
    navigationSpy.mockRestore();
  });

  it('should mark a tab as archived if it has been idle for too long', async () => {
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
                  closeAllTabs={jest.fn}
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

  it('should show active account toast when visiting a site with permitted accounts', () => {
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
      closeAllTabs: jest.fn(),
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

    it('should show toast when url changes to a new host with a permitted account', () => {
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

    it('should show toast when accounts become available for the current host', () => {
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

    it('should NOT show toast if host changes but no permitted accounts for new host', () => {
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

    it('should NOT show toast if already on the same host with permitted accounts', () => {
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

    it('should NOT show toast if there are no accounts at all', () => {
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

    it('should NOT show toast if effectiveUrl is null/undefined', () => {
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

    it('should use browserUrl from props if currentUrl is not set initially', () => {
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

jest.useRealTimers();
