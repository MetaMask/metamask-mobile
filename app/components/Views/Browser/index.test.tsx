// write unit test so that browser/index.js->newTab()
// 1. if tabs.length > 4, show the max browser tabs modal
// 2. if tabs.length <= 4, create a new tab

import React from 'react';
import { render } from '@testing-library/react-native';
import { Browser } from './index';
import Routes from '../../../constants/navigation/Routes';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';

import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { Store } from 'redux';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ThemeContext, mockTheme } from '../../../util/theme';
import initialRootState from '../../../util/test/initial-root-state';

const mockTabs = [
  { id: 1, url: 'about:blank', image: '' },
  { id: 2, url: 'about:blank', image: '' },
  { id: 3, url: 'about:blank', image: '' },
  { id: 4, url: 'about:blank', image: '' },
  { id: 5, url: 'about:blank', image: '' },
];

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      BrowserController: { tabs: mockTabs },
    },
  },
  security: {
    dataCollectionForMarketing: false,
  },
  settings: {
    showFiatOnTestnets: true,
    primaryCurrency: 'ETH',
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
    )
    expect(toJSON()).toMatchSnapshot();
  });

  it('should navigate to MAX_BROWSER_TABS_MODAL when newTab executed to add a 6th tab', () => {
    const mockNavigate = jest.fn();


    // create Browser component with mock route params of `newTabUrl` and `timestamp`
    const route = {
      params: {
        newTabUrl: 'about:blank',
        timestamp: '123',
      },
    };

    const component = render(
      <Browser
        tabs={mockTabs}
        navigation={{ navigate: mockNavigate }}
        createNewTab={jest.fn}
      />
    );

    // send new `route` property to the component
    component.setProps({ route });

    // expect the navigation to have been called with the correct params
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.MAX_BROWSER_TABS_MODAL);
  });
});