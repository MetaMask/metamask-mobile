/* eslint-disable import/no-nodejs-modules */
import React from 'react';
import Main from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import initialRootState from '../../../util/test/initial-root-state';

// Mock Ramp SDK dependencies to prevent SdkEnvironment.Production errors
jest.mock('../../../components/UI/Ramp', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement('RampOrdersMock'),
  };
});

jest.mock('../../../components/UI/Ramp/Deposit/sdk', () => ({
  DepositSDKProvider: ({ children }: { children: React.ReactNode }) => children,
  DepositSDKContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

jest.mock('../../../components/UI/Ramp/Deposit/orderProcessor', () => ({}));

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '0.0.0'),
  getBuildNumber: jest.fn(() => '0'),
  getUniqueId: jest.fn(() => 'test-device-id'),
  getDeviceId: jest.fn(() => 'test-device-id'),
}));

// Mock heavy child components to avoid deep dependency issues
jest.mock('./MainNavigator', () => {
  const React = require('react');
  const MockMainNavigator = () => React.createElement('MainNavigatorMock');
  MockMainNavigator.router = {};
  return {
    __esModule: true,
    default: MockMainNavigator,
  };
});

jest.mock('../../UI/GlobalAlert', () => {
  const React = require('react');
  return () => React.createElement('GlobalAlertMock');
});

jest.mock('../../UI/FadeOutOverlay', () => {
  const React = require('react');
  return () => React.createElement('FadeOutOverlayMock');
});

jest.mock('../../UI/Notification', () => {
  const React = require('react');
  return () => React.createElement('NotificationMock');
});

jest.mock('../../UI/Card/sdk', () => ({
  CardVerification: () => null,
  CardSDKProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../UI/Earn/components/EarnTransactionMonitor', () => {
  const React = require('react');
  return () => React.createElement('EarnTransactionMonitorMock');
});

jest.mock('../../UI/ProtectYourWalletModal', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement('ProtectYourWalletModalMock'),
  };
});

jest.mock('./RootRPCMethodsUI', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement('RootRPCMethodsUIMock'),
  };
});

jest.mock('../../Views/ProtectWalletMandatoryModal/ProtectWalletMandatoryModal', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement('ProtectWalletMandatoryModalMock'),
  };
});

jest.mock('../../UI/ReviewModal', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement('ReviewModalMock'),
  };
});

jest.mock('../../../util/transaction-controller', () => ({
  updateIncomingTransactions: jest.fn(),
  startIncomingTransactionPolling: jest.fn(),
  stopIncomingTransactionPolling: jest.fn(),
}));

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

describe('Main', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<Main />, {
      state: {
        ...initialRootState,
        user: {
          ...initialRootState.user,
          isConnectionRemoved: false,
        },
      },
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly with isConnectionRemoved true', () => {
    const { toJSON } = renderWithProvider(<Main />, {
      state: {
        ...initialRootState,
        user: {
          ...initialRootState.user,
          isConnectionRemoved: true,
        },
      },
    });
    expect(toJSON()).toMatchSnapshot();
  });
});
