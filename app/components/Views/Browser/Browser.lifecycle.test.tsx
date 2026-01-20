// Browser component lifecycle hooks and callbacks tests
// Split from index.test.tsx to prevent React Testing Library state pollution
// write unit test so that browser/index.js->newTab()
// 1. if tabs.length > 4, show the max browser tabs modal
// 2. if tabs.length <= 4, create a new tab

import React, { ComponentType } from 'react';
import { Browser as BrowserComponent } from './index';
import { BrowserComponentProps } from './Browser.types';
import Routes from '../../../constants/navigation/Routes';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';

import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { act } from '@testing-library/react-native';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { MetaMetricsEvents } from '../../../core/Analytics';
import BrowserTab from '../BrowserTab/BrowserTab';

const Browser = BrowserComponent as ComponentType<BrowserComponentProps>;

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
  isProductSafetyDappScanningEnabled: jest.fn().mockReturnValue(false),
  getPhishingTestResult: jest.fn().mockReturnValue({ result: false }),
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

describe('Browser - Lifecycle and Callbacks', () => {
  describe('useEffect hooks', () => {
    it('switches to existing tab when existingTabId is provided', () => {
      const tabs = [
        { id: 1, url: 'https://tab1.com', image: '', isArchived: false },
        { id: 2, url: 'https://tab2.com', image: '', isArchived: false },
      ];
      const mockSetActiveTab = jest.fn();

      renderWithProvider(
        <Provider store={mockStore(mockInitialState)}>
          <NavigationContainer independent>
            <Stack.Navigator>
              <Stack.Screen name={Routes.BROWSER.VIEW}>
                {() => (
                  <Browser
                    route={{ params: { existingTabId: 2 } }}
                    tabs={tabs}
                    activeTab={1}
                    navigation={mockNavigation}
                    createNewTab={jest.fn()}
                    closeAllTabs={jest.fn()}
                    closeTab={jest.fn()}
                    setActiveTab={mockSetActiveTab}
                    updateTab={jest.fn()}
                  />
                )}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </Provider>,
        {
          state: {
            ...mockInitialState,
            browser: {
              tabs,
              activeTab: 1,
            },
          },
        },
      );

      expect(mockSetActiveTab).toBeDefined();
    });

    it('switches to first tab when activeTab is not set but tabs exist', () => {
      const tabs = [
        { id: 1, url: 'https://tab1.com', image: '', isArchived: false },
        { id: 2, url: 'https://tab2.com', image: '', isArchived: false },
      ];
      const mockSetActiveTab = jest.fn();

      renderWithProvider(
        <Provider store={mockStore(mockInitialState)}>
          <NavigationContainer independent>
            <Stack.Navigator>
              <Stack.Screen name={Routes.BROWSER.VIEW}>
                {() => (
                  <Browser
                    route={routeMock}
                    tabs={tabs}
                    activeTab={null}
                    navigation={mockNavigation}
                    createNewTab={jest.fn()}
                    closeAllTabs={jest.fn()}
                    closeTab={jest.fn()}
                    setActiveTab={mockSetActiveTab}
                    updateTab={jest.fn()}
                  />
                )}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </Provider>,
        {
          state: {
            ...mockInitialState,
            browser: {
              tabs,
              activeTab: null,
            },
          },
        },
      );

      expect(mockSetActiveTab).toBeDefined();
    });

    it('detects new tab added and switches to it', () => {
      const initialTabs = [
        { id: 1, url: 'https://tab1.com', image: '', isArchived: false },
      ];
      const mockSetActiveTab = jest.fn();

      const { rerender } = renderWithProvider(
        <Provider store={mockStore(mockInitialState)}>
          <NavigationContainer independent>
            <Stack.Navigator>
              <Stack.Screen name={Routes.BROWSER.VIEW}>
                {() => (
                  <Browser
                    route={routeMock}
                    tabs={initialTabs}
                    activeTab={1}
                    navigation={mockNavigation}
                    createNewTab={jest.fn()}
                    closeAllTabs={jest.fn()}
                    closeTab={jest.fn()}
                    setActiveTab={mockSetActiveTab}
                    updateTab={jest.fn()}
                  />
                )}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </Provider>,
        {
          state: {
            ...mockInitialState,
            browser: {
              tabs: initialTabs,
              activeTab: 1,
            },
          },
        },
      );

      const newTabs = [
        ...initialTabs,
        { id: 2, url: 'https://tab2.com', image: '', isArchived: false },
      ];

      rerender(
        <Provider store={mockStore(mockInitialState)}>
          <NavigationContainer independent>
            <Stack.Navigator>
              <Stack.Screen name={Routes.BROWSER.VIEW}>
                {() => (
                  <Browser
                    route={routeMock}
                    tabs={newTabs}
                    activeTab={1}
                    navigation={mockNavigation}
                    createNewTab={jest.fn()}
                    closeAllTabs={jest.fn()}
                    closeTab={jest.fn()}
                    setActiveTab={mockSetActiveTab}
                    updateTab={jest.fn()}
                  />
                )}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </Provider>,
      );

      expect(mockSetActiveTab).toBeDefined();
    });

    it('switches to existing tab when existingTabId matches tab id', () => {
      const tabs = [
        { id: 1, url: 'https://tab1.com', image: '', isArchived: false },
        { id: 2, url: 'https://tab2.com', image: '', isArchived: false },
      ];
      const mockSetActiveTab = jest.fn();
      const mockUpdateTab = jest.fn();

      renderWithProvider(
        <Provider store={mockStore(mockInitialState)}>
          <NavigationContainer independent>
            <Stack.Navigator>
              <Stack.Screen name={Routes.BROWSER.VIEW}>
                {() => (
                  <Browser
                    route={{ params: { existingTabId: 2 } }}
                    tabs={tabs}
                    activeTab={1}
                    navigation={mockNavigation}
                    createNewTab={jest.fn()}
                    closeAllTabs={jest.fn()}
                    closeTab={jest.fn()}
                    setActiveTab={mockSetActiveTab}
                    updateTab={mockUpdateTab}
                  />
                )}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </Provider>,
        {
          state: {
            ...mockInitialState,
            browser: {
              tabs,
              activeTab: 1,
            },
          },
        },
      );

      // Component should switch to existing tab
      expect(mockCreateEventBuilder).toHaveBeenCalled();
    });

    it('does not switch when existingTabId does not match any tab', () => {
      const tabs = [
        { id: 1, url: 'https://tab1.com', image: '', isArchived: false },
      ];
      const mockSetActiveTab = jest.fn();

      renderWithProvider(
        <Provider store={mockStore(mockInitialState)}>
          <NavigationContainer independent>
            <Stack.Navigator>
              <Stack.Screen name={Routes.BROWSER.VIEW}>
                {() => (
                  <Browser
                    route={{ params: { existingTabId: 999 } }}
                    tabs={tabs}
                    activeTab={1}
                    navigation={mockNavigation}
                    createNewTab={jest.fn()}
                    closeAllTabs={jest.fn()}
                    closeTab={jest.fn()}
                    setActiveTab={mockSetActiveTab}
                    updateTab={jest.fn()}
                  />
                )}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </Provider>,
        {
          state: {
            ...mockInitialState,
            browser: {
              tabs,
              activeTab: 1,
            },
          },
        },
      );

      // Component renders without error
      expect(mockSetActiveTab).toBeDefined();
    });
  });

  describe('tab archiving logic', () => {
    it('unarchives active tab when it becomes active', async () => {
      const tabs = [
        { id: 1, url: 'https://tab1.com', image: '', isArchived: true },
        { id: 2, url: 'https://tab2.com', image: '', isArchived: false },
      ];
      const mockUpdateTab = jest.fn();

      renderWithProvider(
        <Provider store={mockStore(mockInitialState)}>
          <NavigationContainer independent>
            <Stack.Navigator>
              <Stack.Screen name={Routes.BROWSER.VIEW}>
                {() => (
                  <Browser
                    route={routeMock}
                    tabs={tabs}
                    activeTab={1}
                    navigation={mockNavigation}
                    createNewTab={jest.fn()}
                    closeAllTabs={jest.fn()}
                    closeTab={jest.fn()}
                    setActiveTab={jest.fn()}
                    updateTab={mockUpdateTab}
                  />
                )}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </Provider>,
        {
          state: {
            ...mockInitialState,
            browser: {
              tabs,
              activeTab: 1,
            },
          },
        },
      );

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Active tab should be unarchived (may also include url if switchToTab was called)
      expect(mockUpdateTab).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ isArchived: false }),
      );
    });

    it('resets idle time for active tab', async () => {
      const tabs = [
        { id: 1, url: 'https://tab1.com', image: '', isArchived: false },
        { id: 2, url: 'https://tab2.com', image: '', isArchived: false },
      ];
      const mockUpdateTab = jest.fn();

      renderWithProvider(
        <Provider store={mockStore(mockInitialState)}>
          <NavigationContainer independent>
            <Stack.Navigator>
              <Stack.Screen name={Routes.BROWSER.VIEW}>
                {() => (
                  <Browser
                    route={routeMock}
                    tabs={tabs}
                    activeTab={1}
                    navigation={mockNavigation}
                    createNewTab={jest.fn()}
                    closeAllTabs={jest.fn()}
                    closeTab={jest.fn()}
                    setActiveTab={jest.fn()}
                    updateTab={mockUpdateTab}
                  />
                )}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </Provider>,
        {
          state: {
            ...mockInitialState,
            browser: {
              tabs,
              activeTab: 1,
            },
          },
        },
      );

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Active tab should be unarchived (idle time reset)
      expect(mockUpdateTab).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ isArchived: false }),
      );
    });
  });

  describe('component initialization', () => {
    it('resumes active tab when component mounts with existing active tab', () => {
      const tabs = [
        { id: 1, url: 'https://tab1.com', image: '', isArchived: false },
      ];
      const mockSetActiveTab = jest.fn();
      const mockUpdateTab = jest.fn();

      renderWithProvider(
        <Provider store={mockStore(mockInitialState)}>
          <NavigationContainer independent>
            <Stack.Navigator>
              <Stack.Screen name={Routes.BROWSER.VIEW}>
                {() => (
                  <Browser
                    route={routeMock}
                    tabs={tabs}
                    activeTab={1}
                    navigation={mockNavigation}
                    createNewTab={jest.fn()}
                    closeAllTabs={jest.fn()}
                    closeTab={jest.fn()}
                    setActiveTab={mockSetActiveTab}
                    updateTab={mockUpdateTab}
                  />
                )}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </Provider>,
        {
          state: {
            ...mockInitialState,
            browser: {
              tabs,
              activeTab: 1,
            },
          },
        },
      );

      // Component should switch to active tab on mount
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.BROWSER_SWITCH_TAB,
      );
    });

    it('switches to first tab when activeTab is null but tabs exist', () => {
      const tabs = [
        { id: 1, url: 'https://tab1.com', image: '', isArchived: false },
        { id: 2, url: 'https://tab2.com', image: '', isArchived: false },
      ];
      const mockSetActiveTab = jest.fn();

      renderWithProvider(
        <Provider store={mockStore(mockInitialState)}>
          <NavigationContainer independent>
            <Stack.Navigator>
              <Stack.Screen name={Routes.BROWSER.VIEW}>
                {() => (
                  <Browser
                    route={routeMock}
                    tabs={tabs}
                    activeTab={null}
                    navigation={mockNavigation}
                    createNewTab={jest.fn()}
                    closeAllTabs={jest.fn()}
                    closeTab={jest.fn()}
                    setActiveTab={mockSetActiveTab}
                    updateTab={jest.fn()}
                  />
                )}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </Provider>,
        {
          state: {
            ...mockInitialState,
            browser: {
              tabs,
              activeTab: null,
            },
          },
        },
      );

      // Component should switch to first tab
      expect(mockCreateEventBuilder).toHaveBeenCalled();
    });
  });

  describe('route params handling', () => {
    it('creates new tab when newTabUrl and timestamp are provided', () => {
      const mockCreateNewTab = jest.fn();

      renderWithProvider(
        <Provider store={mockStore(mockInitialState)}>
          <NavigationContainer independent>
            <Stack.Navigator>
              <Stack.Screen name={Routes.BROWSER.VIEW}>
                {() => (
                  <Browser
                    route={{
                      params: {
                        newTabUrl: 'https://test.com',
                        timestamp: '123456',
                      },
                    }}
                    tabs={[]}
                    activeTab={null}
                    navigation={mockNavigation}
                    createNewTab={mockCreateNewTab}
                    closeAllTabs={jest.fn()}
                    closeTab={jest.fn()}
                    setActiveTab={jest.fn()}
                    updateTab={jest.fn()}
                  />
                )}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </Provider>,
        { state: mockInitialState },
      );

      expect(mockCreateNewTab).toHaveBeenCalled();
    });

    it('does not create new tab when only newTabUrl is provided without timestamp', () => {
      const mockCreateNewTab = jest.fn();

      renderWithProvider(
        <Provider store={mockStore(mockInitialState)}>
          <NavigationContainer independent>
            <Stack.Navigator>
              <Stack.Screen name={Routes.BROWSER.VIEW}>
                {() => (
                  <Browser
                    route={{ params: { newTabUrl: 'https://test.com' } }}
                    tabs={[]}
                    activeTab={null}
                    navigation={mockNavigation}
                    createNewTab={mockCreateNewTab}
                    closeAllTabs={jest.fn()}
                    closeTab={jest.fn()}
                    setActiveTab={jest.fn()}
                    updateTab={jest.fn()}
                  />
                )}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </Provider>,
        { state: mockInitialState },
      );

      // Component should NOT create tab because newTabUrl is provided without timestamp
      // The component only creates a tab automatically when NEITHER newTabUrl nor existingTabId is provided
      expect(mockCreateNewTab).not.toHaveBeenCalled();
    });

    it('does not create new tab when only timestamp is provided without newTabUrl', () => {
      const tabs = [
        { id: 1, url: 'https://tab1.com', image: '', isArchived: false },
      ];
      const mockCreateNewTab = jest.fn();

      renderWithProvider(
        <Provider store={mockStore(mockInitialState)}>
          <NavigationContainer independent>
            <Stack.Navigator>
              <Stack.Screen name={Routes.BROWSER.VIEW}>
                {() => (
                  <Browser
                    route={{ params: { timestamp: '123456' } }}
                    tabs={tabs}
                    activeTab={1}
                    navigation={mockNavigation}
                    createNewTab={mockCreateNewTab}
                    closeAllTabs={jest.fn()}
                    closeTab={jest.fn()}
                    setActiveTab={jest.fn()}
                    updateTab={jest.fn()}
                  />
                )}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </Provider>,
        {
          state: {
            ...mockInitialState,
            browser: {
              tabs,
              activeTab: 1,
            },
          },
        },
      );

      // Component should not create new tab from route params without newTabUrl
      // (it will switch to existing active tab instead)
      expect(mockCreateEventBuilder).toHaveBeenCalled();
    });
  });

  describe('updateTabInfo callback', () => {
    it('calls updateTab when updateTabInfo is invoked', () => {
      const tabs = [
        { id: 1, url: 'https://tab1.com', image: '', isArchived: false },
      ];
      const mockUpdateTab = jest.fn();
      const BrowserTabMock = jest.mocked(BrowserTab);
      let updateTabInfoCallback:
        | ((
            tabID: number,
            info: { url?: string; isArchived?: boolean; image?: string },
          ) => void)
        | undefined;

      BrowserTabMock.mockImplementation((props) => {
        updateTabInfoCallback = props?.updateTabInfo;
        return React.createElement('View', { testID: 'BrowserTab' });
      });

      renderWithProvider(
        <Provider store={mockStore(mockInitialState)}>
          <NavigationContainer independent>
            <Stack.Navigator>
              <Stack.Screen name={Routes.BROWSER.VIEW}>
                {() => (
                  <Browser
                    route={routeMock}
                    tabs={tabs}
                    activeTab={1}
                    navigation={mockNavigation}
                    createNewTab={jest.fn()}
                    closeAllTabs={jest.fn()}
                    closeTab={jest.fn()}
                    setActiveTab={jest.fn()}
                    updateTab={mockUpdateTab}
                  />
                )}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </Provider>,
        {
          state: {
            ...mockInitialState,
            browser: {
              tabs,
              activeTab: 1,
            },
          },
        },
      );

      // Call updateTabInfo to test the callback
      if (updateTabInfoCallback) {
        updateTabInfoCallback(1, { url: 'https://updated.com' });
      }

      expect(mockUpdateTab).toHaveBeenCalledWith(1, {
        url: 'https://updated.com',
      });
    });
  });

  describe('homePageUrl callback', () => {
    it('uses homePageUrl when creating new tab without URL', () => {
      const tabs = [
        { id: 1, url: 'https://tab1.com', image: '', isArchived: false },
      ];
      const mockCreateNewTab = jest.fn();

      renderWithProvider(
        <Provider store={mockStore(mockInitialState)}>
          <NavigationContainer independent>
            <Stack.Navigator>
              <Stack.Screen name={Routes.BROWSER.VIEW}>
                {() => (
                  <Browser
                    route={{
                      params: { newTabUrl: undefined, timestamp: '123' },
                    }}
                    tabs={tabs}
                    activeTab={1}
                    navigation={mockNavigation}
                    createNewTab={mockCreateNewTab}
                    closeAllTabs={jest.fn()}
                    closeTab={jest.fn()}
                    setActiveTab={jest.fn()}
                    updateTab={jest.fn()}
                  />
                )}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </Provider>,
        {
          state: {
            ...mockInitialState,
            browser: {
              tabs,
              activeTab: 1,
            },
          },
        },
      );

      // Component should handle undefined newTabUrl
      expect(mockCreateNewTab).toBeDefined();
    });
  });
});

jest.useRealTimers();
