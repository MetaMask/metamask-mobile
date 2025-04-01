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
  }
};

jest.mock('../../../core/Engine', () => ({
  context: {
    PhishingController: {
      maybeUpdateState: jest.fn(),
      test: jest.fn((url: string) => {
        if (url === 'phishing.com') return { result: true };
        return { result: false };
      }),
    },
  },
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  openURL: jest.fn(),
  canOpenURL: jest.fn(),
  getInitialURL: jest.fn(),
}));

jest.mock('../../../util/phishingProtection', () => ({
  isPhishingProtectionEnabled: jest.fn().mockReturnValue(false),
  isOriginSafe: jest.fn().mockReturnValue(true),
  updatePhishingLists: jest.fn(),
  getPhishingTestResult: jest.fn().mockReturnValue(null),
  // If there's a usePhishingDetection hook, mock it too
  usePhishingDetection: jest.fn().mockReturnValue({
    isPhishingDetected: false,
    blockedUrl: '',
    continueToPhishingSite: jest.fn(),
    goBackToSafety: jest.fn()
  }),
  PhishingDetectedModal: jest.fn(() => null)
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
      </Provider>, { state: { ...mockInitialState } },
    );
    expect(toJSON()).toMatchSnapshot();
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

    // Spy on the console.log to check if myFunction was called
    const navigationSpy = jest.spyOn(mockNavigation, 'navigate');

    // rerender with a different route value
    rerender(
      <Provider store={mockStore(mockInitialState)}>
        <NavigationContainer independent>
          <Stack.Navigator>
            <Stack.Screen name={Routes.BROWSER.VIEW}>
              {() => (
                <Browser
                  route={{ params: { newTabUrl: 'about:blank', timestamp: '987' } }}
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
      </Provider>
    );
    // Check if myFunction was called
    expect(navigationSpy).toHaveBeenCalledWith(Routes.MODAL.MAX_BROWSER_TABS_MODAL);

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
      </Provider>
    );

    // Wrap the timer advancement in act
    await act(async () => {
      jest.advanceTimersByTime(1000 * 60 * 5);
    });

    expect(mockUpdateTab).toHaveBeenCalledWith(2, { isArchived: true });
  });
});
