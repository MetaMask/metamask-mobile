// write unit test so that browser/index.js->newTab()
// 1. if tabs.length > 4, show the max browser tabs modal
// 2. if tabs.length <= 4, create a new tab

import React from 'react';
import { render } from '@testing-library/react-native';
import { Browser } from './index';
import Routes from '../../../constants/navigation/Routes';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { createStackNavigator } from '@react-navigation/stack';

const mockTabs = [
  { id: 1, url: 'about:blank', image: '' },
  { id: 2, url: 'about:blank', image: '' },
  { id: 3, url: 'about:blank', image: '' },
  { id: 4, url: 'about:blank', image: '' },
  { id: 5, url: 'about:blank', image: '' },
];

jest.mock('@react-navigation/stack', () => {
  return {
    createStackNavigator: jest.fn(() => {
      return {
        Navigator: ({ children }) => <>{children}</>,
        Screen: ({ children }) => <>{children}</>,
      };
    }),
  };
});

// mock createBottomTabNavigator
jest.mock('@react-navigation/bottom-tabs', () => {
  return {
    createBottomTabNavigator: jest.fn(() => {
      return {
        Navigator: ({ children }) => <>{children}</>, Screen: ({ children }) => <>{children}</>,
      };
    }),
  };
});

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      BrowserController: { tabs: mockTabs },
    },
  },
};

const Stack = createStackNavigator();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    navigation: {},
  }),
  createNavigatorFactory: () => ({}),
  useRoute: jest.fn(() => ({
    params: {
      onScanError: jest.fn(),
      onScanSuccess: jest.fn(),
      initialScreen: 0,
    },
  })),
}));

describe('Browser', () => {
  it('should render correctly', () => {
    const renderComponent = (state) => renderWithProvider(
      <Stack.Navigator>
        <Stack.Screen name="Browser" options={{}}>
          {(props) => <Browser tabs={mockTabs} {...props} />}
        </Stack.Screen>
      </Stack.Navigator>,
      { state: { ...mockInitialState, ...state } },
    );
    expect(renderComponent().toJSON()).toMatchSnapshot();
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
