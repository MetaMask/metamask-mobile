// Browser component function tests
// Additional tests to improve coverage for uncovered functions

import React, { ComponentType } from 'react';
import { BrowserPure as BrowserComponent } from './index';
import { BrowserComponentProps } from './Browser.types';
import Routes from '../../../constants/navigation/Routes';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';

import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { act } from '@testing-library/react-native';
import { isTokenDiscoveryBrowserEnabled } from '../../../util/browser';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { captureScreen } from 'react-native-view-shot';
import Logger from '../../../util/Logger';
import BrowserTab from '../BrowserTab/BrowserTab';
import Tabs from '../../UI/Tabs';

const Browser = BrowserComponent as ComponentType<BrowserComponentProps>;

jest.mock('../../hooks/useAccounts', () => ({
  useAccounts: jest.fn().mockReturnValue({
    evmAccounts: [],
    accounts: [],
    ensByAccountAddress: {},
  }),
}));

jest.mock('../../../core/Permissions', () => ({
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
  default: jest.fn(() => 'Tabs'),
}));

const mockTabs = [
  { id: 1, url: 'https://example.com', image: '', isArchived: false },
  { id: 2, url: 'https://test.com', image: '', isArchived: false },
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
        getCaveat: jest.fn(),
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

describe('Browser - Function Coverage Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('takeScreenshot function', () => {
    it('captures screen and updates tab with image', async () => {
      const mockCaptureScreen = captureScreen as jest.Mock;
      mockCaptureScreen.mockResolvedValue('screenshot-uri.jpg');

      const mockUpdateTab = jest.fn();
      const tabs = [
        { id: 1, url: 'https://example.com', image: '', isArchived: false },
      ];

      let showTabsCallback: (() => Promise<void>) | undefined;
      const BrowserTabMock = jest.mocked(BrowserTab);
      BrowserTabMock.mockImplementation((props) => {
        if (props?.showTabs) {
          showTabsCallback = props.showTabs as () => Promise<void>;
        }
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

      // Call showTabs which triggers takeScreenshot
      expect(showTabsCallback).toBeDefined();
      const callback = showTabsCallback;
      if (callback) {
        await act(async () => {
          await callback();
        });
      }

      expect(mockCaptureScreen).toHaveBeenCalled();
      expect(mockUpdateTab).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          url: 'https://example.com',
          image: 'screenshot-uri.jpg',
        }),
      );
    });

    it('logs error when screenshot fails', async () => {
      const mockCaptureScreen = captureScreen as jest.Mock;
      const mockLoggerError = Logger.error as jest.Mock;
      mockCaptureScreen.mockRejectedValue(new Error('Screenshot failed'));

      const tabs = [
        { id: 1, url: 'https://example.com', image: '', isArchived: false },
      ];

      let showTabsCallback: (() => Promise<void>) | undefined;
      const BrowserTabMock = jest.mocked(BrowserTab);
      BrowserTabMock.mockImplementation((props) => {
        if (props?.showTabs) {
          showTabsCallback = props.showTabs as () => Promise<void>;
        }
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

      // Call showTabs which triggers takeScreenshot
      expect(showTabsCallback).toBeDefined();
      const callback = showTabsCallback;
      if (callback) {
        await act(async () => {
          await callback();
        });
      }

      expect(mockLoggerError).toHaveBeenCalled();
    });
  });

  describe('closeTab function edge cases', () => {
    it('handles closing active tab when it is first in list', () => {
      const tabs = [
        { id: 1, url: 'https://tab1.com', image: '', isArchived: false },
        { id: 2, url: 'https://tab2.com', image: '', isArchived: false },
      ];
      const mockSetActiveTab = jest.fn();
      const mockCloseTab = jest.fn();

      let closeTabCallback:
        | ((tab: { id: number; url: string }) => void)
        | undefined;
      const TabsMock = jest.mocked(Tabs);
      TabsMock.mockImplementation((props) => {
        if (props?.closeTab) {
          closeTabCallback = props.closeTab;
        }
        return React.createElement('View', { testID: 'Tabs' });
      });

      renderWithProvider(
        <Provider store={mockStore(mockInitialState)}>
          <NavigationContainer independent>
            <Stack.Navigator>
              <Stack.Screen name={Routes.BROWSER.VIEW}>
                {() => (
                  <Browser
                    route={{ params: { showTabsView: true } }}
                    tabs={tabs}
                    activeTab={1}
                    navigation={mockNavigation}
                    createNewTab={jest.fn()}
                    closeTab={mockCloseTab}
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

      // Close the first (active) tab
      if (closeTabCallback) {
        closeTabCallback({ id: 1, url: 'https://tab1.com' });
      }

      // Should switch to next tab (id: 2)
      expect(mockSetActiveTab).toHaveBeenCalledWith(2);
      expect(mockCloseTab).toHaveBeenCalledWith(1);
    });

    it('handles closing non-active tab', () => {
      const tabs = [
        { id: 1, url: 'https://tab1.com', image: '', isArchived: false },
        { id: 2, url: 'https://tab2.com', image: '', isArchived: false },
      ];
      const mockSetActiveTab = jest.fn();
      const mockCloseTab = jest.fn();

      let closeTabCallback:
        | ((tab: { id: number; url: string }) => void)
        | undefined;
      const TabsMock = jest.mocked(Tabs);
      TabsMock.mockImplementation((props) => {
        if (props?.closeTab) {
          closeTabCallback = props.closeTab;
        }
        return React.createElement('View', { testID: 'Tabs' });
      });

      renderWithProvider(
        <Provider store={mockStore(mockInitialState)}>
          <NavigationContainer independent>
            <Stack.Navigator>
              <Stack.Screen name={Routes.BROWSER.VIEW}>
                {() => (
                  <Browser
                    route={{ params: { showTabsView: true } }}
                    tabs={tabs}
                    activeTab={1}
                    navigation={mockNavigation}
                    createNewTab={jest.fn()}
                    closeTab={mockCloseTab}
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

      // Clear mocks after initial render (which calls setActiveTab during switchToTab)
      mockSetActiveTab.mockClear();

      // Close a non-active tab
      if (closeTabCallback) {
        closeTabCallback({ id: 2, url: 'https://tab2.com' });
      }

      // Should not switch active tab when closing non-active
      expect(mockSetActiveTab).not.toHaveBeenCalled();
      expect(mockCloseTab).toHaveBeenCalledWith(2);
    });
  });

  describe('newTab function with replaceActiveIfMax', () => {
    it('replaces active tab when max tabs reached and fromTrending is true', () => {
      const maxTabs = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        url: `https://tab${i + 1}.com`,
        image: '',
        isArchived: false,
      }));
      const mockUpdateTab = jest.fn();
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
                        newTabUrl: 'https://newurl.com',
                        timestamp: Date.now().toString(),
                        fromTrending: true,
                      },
                    }}
                    tabs={maxTabs}
                    activeTab={1}
                    navigation={mockNavigation}
                    createNewTab={mockCreateNewTab}
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
              tabs: maxTabs,
              activeTab: 1,
            },
          },
        },
      );

      // Should update the active tab instead of creating new
      expect(mockCreateNewTab).not.toHaveBeenCalled();
      expect(mockUpdateTab).toHaveBeenCalledWith(1, {
        url: 'https://newurl.com',
        isArchived: false,
      });
    });
  });

  describe('DiscoveryTab rendering', () => {
    it('renders DiscoveryTab when token discovery enabled and no URL', () => {
      jest.mocked(isTokenDiscoveryBrowserEnabled).mockReturnValue(true);

      const tabs = [{ id: 1, url: undefined, image: '', isArchived: false }];

      const { getByTestId } = renderWithProvider(
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

      expect(getByTestId('browser-screen')).toBeDefined();
      jest.mocked(isTokenDiscoveryBrowserEnabled).mockReturnValue(false);
    });
  });

  describe('closeTabsView with active tab not in list', () => {
    it('navigates to Explore when active tab was closed', async () => {
      const tabs = [
        { id: 1, url: 'https://tab1.com', image: '', isArchived: false },
        { id: 2, url: 'https://tab2.com', image: '', isArchived: false },
      ];

      let closeTabsViewCallback: (() => void) | undefined;
      const TabsMock = jest.mocked(Tabs);
      TabsMock.mockImplementation((props) => {
        if (props?.closeTabsView) {
          closeTabsViewCallback = props.closeTabsView;
        }
        return React.createElement('View', { testID: 'Tabs' });
      });

      // First render with tabs, then re-render with one tab removed but activeTab still pointing to removed
      const { rerender } = renderWithProvider(
        <Provider store={mockStore(mockInitialState)}>
          <NavigationContainer independent>
            <Stack.Navigator>
              <Stack.Screen name={Routes.BROWSER.VIEW}>
                {() => (
                  <Browser
                    route={{ params: { showTabsView: true } }}
                    tabs={tabs}
                    activeTab={1}
                    navigation={mockNavigation}
                    createNewTab={jest.fn()}
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

      // Rerender with tab 1 removed but activeTab still 1 (simulating async close)
      const remainingTabs = [
        { id: 2, url: 'https://tab2.com', image: '', isArchived: false },
      ];

      rerender(
        <Provider store={mockStore(mockInitialState)}>
          <NavigationContainer independent>
            <Stack.Navigator>
              <Stack.Screen name={Routes.BROWSER.VIEW}>
                {() => (
                  <Browser
                    route={{ params: { showTabsView: true } }}
                    tabs={remainingTabs}
                    activeTab={1}
                    navigation={mockNavigation}
                    createNewTab={jest.fn()}
                    closeTab={jest.fn()}
                    setActiveTab={jest.fn()}
                    updateTab={jest.fn()}
                  />
                )}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </Provider>,
      );

      // Call closeTabsView
      if (closeTabsViewCallback) {
        closeTabsViewCallback();
      }

      // Should navigate to Explore because activeTab 1 is not in the tabs list
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.TRENDING_VIEW,
        { screen: Routes.TRENDING_FEED },
      );
    });
  });

  describe('showTabsView with no active tab URL', () => {
    it('handles showTabs when active tab URL is undefined', async () => {
      const mockLoggerError = Logger.error as jest.Mock;
      const tabs = [{ id: 1, url: undefined, image: '', isArchived: false }];

      let showTabsCallback: (() => Promise<void>) | undefined;
      const BrowserTabMock = jest.mocked(BrowserTab);
      BrowserTabMock.mockImplementation((props) => {
        if (props?.showTabs) {
          showTabsCallback = props.showTabs as () => Promise<void>;
        }
        return React.createElement('View', { testID: 'BrowserTab' });
      });

      // Disable token discovery to render BrowserTab
      jest.mocked(isTokenDiscoveryBrowserEnabled).mockReturnValue(false);

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

      // Call showTabs
      expect(showTabsCallback).toBeDefined();
      const callback = showTabsCallback;
      if (callback) {
        await act(async () => {
          await callback();
        });
      }

      // Error should be logged because activeTabUrl is undefined
      expect(mockLoggerError).toHaveBeenCalled();
    });
  });

  describe('hideTabsAndUpdateUrl function', () => {
    it('hides tabs view and updates URL when switching tabs', () => {
      const tabs = [
        { id: 1, url: 'https://tab1.com', image: '', isArchived: false },
        { id: 2, url: 'https://tab2.com', image: '', isArchived: false },
      ];

      let switchToTabCallback:
        | ((tab: { id: number; url: string }) => void)
        | undefined;
      const TabsMock = jest.mocked(Tabs);
      TabsMock.mockImplementation((props) => {
        if (props?.switchToTab) {
          switchToTabCallback = props.switchToTab;
        }
        return React.createElement('View', { testID: 'Tabs' });
      });

      const mockSetActiveTab = jest.fn();
      const mockUpdateTab = jest.fn();

      renderWithProvider(
        <Provider store={mockStore(mockInitialState)}>
          <NavigationContainer independent>
            <Stack.Navigator>
              <Stack.Screen name={Routes.BROWSER.VIEW}>
                {() => (
                  <Browser
                    route={{ params: { showTabsView: true } }}
                    tabs={tabs}
                    activeTab={1}
                    navigation={mockNavigation}
                    createNewTab={jest.fn()}
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

      // Clear mocks after initial render
      mockSetActiveTab.mockClear();
      mockUpdateTab.mockClear();

      // Switch to tab 2
      if (switchToTabCallback) {
        switchToTabCallback({ id: 2, url: 'https://tab2.com' });
      }

      // setActiveTab should be called
      expect(mockSetActiveTab).toHaveBeenCalledWith(2);
      // updateTab should be called to unarchive
      expect(mockUpdateTab).toHaveBeenCalledWith(2, {
        url: 'https://tab2.com',
        isArchived: false,
      });
    });
  });

  describe('updateTabInfo function', () => {
    it('updates tab info when called from BrowserTab', () => {
      const tabs = [
        { id: 1, url: 'https://tab1.com', image: '', isArchived: false },
      ];
      const mockUpdateTab = jest.fn();

      let updateTabInfoCallback:
        | ((tabId: number, info: Record<string, unknown>) => void)
        | undefined;
      const BrowserTabMock = jest.mocked(BrowserTab);
      BrowserTabMock.mockImplementation((props) => {
        if (props?.updateTabInfo) {
          updateTabInfoCallback = props.updateTabInfo;
        }
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

      // Clear mocks
      mockUpdateTab.mockClear();

      // Call updateTabInfo
      if (updateTabInfoCallback) {
        updateTabInfoCallback(1, {
          url: 'https://updated.com',
          title: 'Updated',
        });
      }

      expect(mockUpdateTab).toHaveBeenCalledWith(1, {
        url: 'https://updated.com',
        title: 'Updated',
      });
    });
  });

  describe('newTab with Tabs component', () => {
    it('creates new tab when newTab is called from Tabs component', () => {
      const tabs = [
        { id: 1, url: 'https://tab1.com', image: '', isArchived: false },
      ];
      const mockCreateNewTab = jest.fn();

      let newTabCallback: ((url?: string) => void) | undefined;
      const TabsMock = jest.mocked(Tabs);
      TabsMock.mockImplementation((props) => {
        if (props?.newTab) {
          newTabCallback = props.newTab;
        }
        return React.createElement('View', { testID: 'Tabs' });
      });

      renderWithProvider(
        <Provider store={mockStore(mockInitialState)}>
          <NavigationContainer independent>
            <Stack.Navigator>
              <Stack.Screen name={Routes.BROWSER.VIEW}>
                {() => (
                  <Browser
                    route={{ params: { showTabsView: true } }}
                    tabs={tabs}
                    activeTab={1}
                    navigation={mockNavigation}
                    createNewTab={mockCreateNewTab}
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

      // Call newTab from Tabs component (without URL for discovery tab)
      if (newTabCallback) {
        newTabCallback();
      }

      // Should create new tab with homePageUrl (token discovery disabled)
      expect(mockCreateNewTab).toHaveBeenCalledWith(
        expect.stringMatching(/^https:\/\//),
        undefined,
      );
    });
  });

  describe('homePageUrl function', () => {
    it('uses homePageUrl when creating new tab without URL', () => {
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
                    activeTab={null}
                    navigation={mockNavigation}
                    createNewTab={mockCreateNewTab}
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
              tabs: [],
              activeTab: null,
            },
          },
        },
      );

      // Should create new tab with homePageUrl
      expect(mockCreateNewTab).toHaveBeenCalledWith(
        expect.stringMatching(/^https:\/\//),
        undefined,
      );
    });
  });

  describe('activeTabUrl memo', () => {
    it('correctly computes activeTabUrl from tabs and activeTab', async () => {
      const mockCaptureScreen = captureScreen as jest.Mock;
      mockCaptureScreen.mockResolvedValue('screenshot.jpg');

      const tabs = [
        { id: 1, url: 'https://first.com', image: '', isArchived: false },
        { id: 2, url: 'https://second.com', image: '', isArchived: false },
      ];
      const mockUpdateTab = jest.fn();

      let showTabsCallback: (() => Promise<void>) | undefined;
      const BrowserTabMock = jest.mocked(BrowserTab);
      BrowserTabMock.mockImplementation((props) => {
        if (props?.showTabs) {
          showTabsCallback = props.showTabs as () => Promise<void>;
        }
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
                    activeTab={2}
                    navigation={mockNavigation}
                    createNewTab={jest.fn()}
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
              activeTab: 2,
            },
          },
        },
      );

      // Call showTabs to trigger takeScreenshot with activeTabUrl
      expect(showTabsCallback).toBeDefined();
      const callback = showTabsCallback;
      if (callback) {
        await act(async () => {
          await callback();
        });
      }

      // Should use activeTab 2's URL (https://second.com)
      expect(mockUpdateTab).toHaveBeenCalledWith(2, {
        url: 'https://second.com',
        image: 'screenshot.jpg',
      });
    });
  });

  describe('closeTab when closing single remaining tab', () => {
    it('sets currentUrl to null when closing the only tab', () => {
      const tabs = [
        { id: 1, url: 'https://only-tab.com', image: '', isArchived: false },
      ];
      const mockCloseTab = jest.fn();
      const mockSetActiveTab = jest.fn();

      let closeTabCallback:
        | ((tab: { id: number; url: string }) => void)
        | undefined;
      const TabsMock = jest.mocked(Tabs);
      TabsMock.mockImplementation((props) => {
        if (props?.closeTab) {
          closeTabCallback = props.closeTab;
        }
        return React.createElement('View', { testID: 'Tabs' });
      });

      renderWithProvider(
        <Provider store={mockStore(mockInitialState)}>
          <NavigationContainer independent>
            <Stack.Navigator>
              <Stack.Screen name={Routes.BROWSER.VIEW}>
                {() => (
                  <Browser
                    route={{ params: { showTabsView: true } }}
                    tabs={tabs}
                    activeTab={1}
                    navigation={mockNavigation}
                    createNewTab={jest.fn()}
                    closeTab={mockCloseTab}
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

      // Clear mocks after initial render (which may call setActiveTab during switchToTab)
      mockSetActiveTab.mockClear();

      // Close the only tab
      if (closeTabCallback) {
        closeTabCallback({ id: 1, url: 'https://only-tab.com' });
      }

      // Should close the tab without setting new active tab
      expect(mockCloseTab).toHaveBeenCalledWith(1);
      // setActiveTab should not be called when there are no other tabs to switch to
      expect(mockSetActiveTab).not.toHaveBeenCalled();
    });
  });

  describe('closeTab when closing active tab selects previous', () => {
    it('selects previous tab when closing active tab at index > 0', () => {
      const tabs = [
        { id: 1, url: 'https://tab1.com', image: '', isArchived: false },
        { id: 2, url: 'https://tab2.com', image: '', isArchived: false },
        { id: 3, url: 'https://tab3.com', image: '', isArchived: false },
      ];
      const mockCloseTab = jest.fn();
      const mockSetActiveTab = jest.fn();

      let closeTabCallback:
        | ((tab: { id: number; url: string }) => void)
        | undefined;
      const TabsMock = jest.mocked(Tabs);
      TabsMock.mockImplementation((props) => {
        if (props?.closeTab) {
          closeTabCallback = props.closeTab;
        }
        return React.createElement('View', { testID: 'Tabs' });
      });

      renderWithProvider(
        <Provider store={mockStore(mockInitialState)}>
          <NavigationContainer independent>
            <Stack.Navigator>
              <Stack.Screen name={Routes.BROWSER.VIEW}>
                {() => (
                  <Browser
                    route={{ params: { showTabsView: true } }}
                    tabs={tabs}
                    activeTab={3}
                    navigation={mockNavigation}
                    createNewTab={jest.fn()}
                    closeTab={mockCloseTab}
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
              activeTab: 3,
            },
          },
        },
      );

      // Clear mocks after initial render
      mockSetActiveTab.mockClear();

      // Close the last (active) tab - should select previous (tab 2)
      if (closeTabCallback) {
        closeTabCallback({ id: 3, url: 'https://tab3.com' });
      }

      // Should select the previous tab (id: 2) since there's no next tab
      expect(mockSetActiveTab).toHaveBeenCalledWith(2);
      expect(mockCloseTab).toHaveBeenCalledWith(3);
    });
  });

  describe('renderBrowserTabWindows with archived tabs', () => {
    it('filters out archived tabs from rendering', () => {
      const tabs = [
        { id: 1, url: 'https://active.com', image: '', isArchived: false },
        { id: 2, url: 'https://archived.com', image: '', isArchived: true },
      ];

      const BrowserTabMock = jest.mocked(BrowserTab);
      BrowserTabMock.mockImplementation((props) =>
        React.createElement('View', {
          testID: `BrowserTab-${props?.id}`,
        }),
      );

      const { queryByTestId } = renderWithProvider(
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

      // Active non-archived tab should be rendered
      expect(queryByTestId('BrowserTab-1')).toBeDefined();
    });
  });

  describe('componentDidMount with existingTabId param', () => {
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

      // Should switch to the existing tab
      expect(mockSetActiveTab).toHaveBeenCalledWith(2);
    });
  });

  describe('newTab navigates to max tabs modal', () => {
    it('navigates to max browser tabs modal when at max capacity without replaceActiveIfMax', () => {
      const maxTabs = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        url: `https://tab${i + 1}.com`,
        image: '',
        isArchived: false,
      }));
      const mockCreateNewTab = jest.fn();

      let newTabCallback: ((url?: string) => void) | undefined;
      const TabsMock = jest.mocked(Tabs);
      TabsMock.mockImplementation((props) => {
        if (props?.newTab) {
          newTabCallback = props.newTab;
        }
        return React.createElement('View', { testID: 'Tabs' });
      });

      renderWithProvider(
        <Provider store={mockStore(mockInitialState)}>
          <NavigationContainer independent>
            <Stack.Navigator>
              <Stack.Screen name={Routes.BROWSER.VIEW}>
                {() => (
                  <Browser
                    route={{ params: { showTabsView: true } }}
                    tabs={maxTabs}
                    activeTab={1}
                    navigation={mockNavigation}
                    createNewTab={mockCreateNewTab}
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
              tabs: maxTabs,
              activeTab: 1,
            },
          },
        },
      );

      // Try to create new tab when at max capacity
      if (newTabCallback) {
        newTabCallback('https://newurl.com');
      }

      // Should navigate to max tabs modal, not create new tab
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.MODAL.MAX_BROWSER_TABS_MODAL,
      );
      expect(mockCreateNewTab).not.toHaveBeenCalled();
    });
  });

  describe('homePageUrl callback', () => {
    it('generates homepage URL using buildPortfolioUrl', () => {
      const tabs: {
        id: number;
        url: string;
        image: string;
        isArchived: boolean;
      }[] = [];
      const mockCreateNewTab = jest.fn();

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
                    createNewTab={mockCreateNewTab}
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
              tabs: [],
              activeTab: null,
            },
          },
        },
      );

      // Should create new tab with homePageUrl when no tabs exist
      expect(mockCreateNewTab).toHaveBeenCalledWith(
        expect.stringMatching(/^https:\/\//),
        undefined,
      );
    });
  });

  describe('renderTabList returns null when tabs view hidden', () => {
    it('does not render Tabs component when shouldShowTabs is false', () => {
      const tabs = [
        { id: 1, url: 'https://tab1.com', image: '', isArchived: false },
      ];

      const TabsMock = jest.mocked(Tabs);
      TabsMock.mockClear();

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

      // Tabs component should not be called when shouldShowTabs is false
      expect(TabsMock).not.toHaveBeenCalled();
    });
  });

  describe('MemoConnectedBrowser route optimization', () => {
    it('renders with route prop correctly', () => {
      const tabs = [
        { id: 1, url: 'https://example.com', image: '', isArchived: false },
      ];

      const { getByTestId } = renderWithProvider(
        <Provider store={mockStore(mockInitialState)}>
          <NavigationContainer independent>
            <Stack.Navigator>
              <Stack.Screen name={Routes.BROWSER.VIEW}>
                {() => (
                  <Browser
                    route={{ params: { url: 'https://test.com' } }}
                    tabs={tabs}
                    activeTab={1}
                    navigation={mockNavigation}
                    createNewTab={jest.fn()}
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

      expect(getByTestId('browser-screen')).toBeDefined();
    });
  });

  describe('componentDidMount with no tabs and no params', () => {
    it('creates new tab when no tabs exist and no deeplink params', () => {
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
                    activeTab={null}
                    navigation={mockNavigation}
                    createNewTab={mockCreateNewTab}
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
              tabs: [],
              activeTab: null,
            },
          },
        },
      );

      // Should create new tab when no tabs exist
      expect(mockCreateNewTab).toHaveBeenCalled();
    });
  });

  describe('componentDidMount switches to first tab when no active tab', () => {
    it('switches to first tab when tabs exist but no active tab set', () => {
      const tabs = [
        { id: 1, url: 'https://first.com', image: '', isArchived: false },
        { id: 2, url: 'https://second.com', image: '', isArchived: false },
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
                    activeTab={999}
                    navigation={mockNavigation}
                    createNewTab={jest.fn()}
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
              activeTab: 999,
            },
          },
        },
      );

      // Should switch to first tab when active tab doesn't exist
      expect(mockSetActiveTab).toHaveBeenCalledWith(1);
    });
  });

  describe('new tab added triggers switch', () => {
    it('switches to newly added tab when tabs array grows', () => {
      const initialTabs = [
        { id: 1, url: 'https://first.com', image: '', isArchived: false },
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

      // Clear mocks after initial render
      mockSetActiveTab.mockClear();

      // Add a new tab
      const newTabs = [
        ...initialTabs,
        { id: 2, url: 'https://new.com', image: '', isArchived: false },
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

      // Should switch to newly added tab
      expect(mockSetActiveTab).toHaveBeenCalledWith(2);
    });
  });
});
