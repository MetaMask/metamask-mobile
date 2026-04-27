/* eslint-disable import-x/no-nodejs-modules */
import React from 'react';
import Main from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import initialRootState from '../../../util/test/initial-root-state';

const mockReact = React;

// Mock Ramp SDK dependencies to prevent SdkEnvironment.Production errors
jest.mock('../../../components/UI/Ramp', () => ({
  __esModule: true,
  default: () => mockReact.createElement('RampOrdersMock'),
}));

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
  const MockMainNavigator = () => mockReact.createElement('MainNavigatorMock');
  MockMainNavigator.router = {};
  return {
    __esModule: true,
    default: MockMainNavigator,
  };
});

jest.mock(
  '../../UI/GlobalAlert',
  () => () => mockReact.createElement('GlobalAlertMock'),
);

jest.mock(
  '../../UI/FadeOutOverlay',
  () => () => mockReact.createElement('FadeOutOverlayMock'),
);

jest.mock(
  '../../UI/Notification',
  () => () => mockReact.createElement('NotificationMock'),
);

jest.mock('../../UI/Card/sdk', () => ({
  CardVerification: () => null,
  CardSDKProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock(
  '../../UI/Earn/components/EarnTransactionMonitor',
  () => () => mockReact.createElement('EarnTransactionMonitorMock'),
);

jest.mock('../../UI/ProtectYourWalletModal', () => ({
  __esModule: true,
  default: () => mockReact.createElement('ProtectYourWalletModalMock'),
}));

jest.mock('./RootRPCMethodsUI', () => ({
  __esModule: true,
  default: () => mockReact.createElement('RootRPCMethodsUIMock'),
}));

jest.mock(
  '../../Views/ProtectWalletMandatoryModal/ProtectWalletMandatoryModal',
  () => ({
    __esModule: true,
    default: () => mockReact.createElement('ProtectWalletMandatoryModalMock'),
  }),
);

jest.mock('../../UI/ReviewModal', () => ({
  __esModule: true,
  default: () => mockReact.createElement('ReviewModalMock'),
}));

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
