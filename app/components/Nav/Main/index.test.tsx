/* eslint-disable import/no-nodejs-modules */
import React from 'react';
import { shallow } from 'enzyme';
// eslint-disable-next-line import/named
import { NavigationContainer } from '@react-navigation/native';
import Main from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

// Mock Ramp SDK dependencies to prevent SdkEnvironment.Production errors
jest.mock('../../../components/UI/Ramp', () => ({
  RampOrders: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../../components/UI/Ramp/Deposit/sdk', () => ({
  DepositSDKProvider: ({ children }: { children: React.ReactNode }) => children,
  DepositSDKContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

jest.mock('../../../components/UI/Ramp/Deposit/orderProcessor', () => ({}));

jest.mock('@consensys/native-ramps-sdk', () => ({
  SdkEnvironment: {
    Production: 'production',
    Staging: 'staging',
  },
  Context: {
    MobileIOS: 'mobile-ios',
    MobileAndroid: 'mobile-android',
  },
  DepositPaymentMethodDuration: {
    instant: 'instant',
    oneToTwoDays: '1_to_2_days',
  },
  NativeRampsSdk: jest.fn(),
}));

const mockStore = configureMockStore();
const mockInitialState = {
  user: {
    isConnectionRemoved: false,
  },
};

describe('Main', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should render correctly', () => {
    const MainAppContainer = () => (
      <Provider store={mockStore(mockInitialState)}>
        <NavigationContainer>
          <Main />
        </NavigationContainer>
      </Provider>
    );
    const wrapper = shallow(<MainAppContainer />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should render correctly with isConnectionRemoved true', () => {
    const mockInitialStateWithConnectionRemoved = {
      user: {
        isConnectionRemoved: true,
      },
    };

    const MainAppContainer = () => (
      <Provider store={mockStore(mockInitialStateWithConnectionRemoved)}>
        <NavigationContainer>
          <Main />
        </NavigationContainer>
      </Provider>
    );
    const wrapper = shallow(<MainAppContainer />);
    expect(wrapper).toMatchSnapshot();
  });
});
