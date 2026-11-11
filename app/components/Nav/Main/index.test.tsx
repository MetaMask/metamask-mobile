/* eslint-disable import-x/no-nodejs-modules */
import React from 'react';
import { View } from 'react-native';
import { act } from '@testing-library/react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { toast } from '@metamask/design-system-react-native';
import Main from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import initialRootState from '../../../util/test/initial-root-state';
import Engine from '../../../core/Engine';
import { updateBgState } from '../../../core/redux/slices/engine';
import { strings } from '../../../../locales/i18n';
import { selectNetworkImageSource } from '../../../selectors/networkInfos';
import { resetSuppressedNetworkAddedToasts } from '../../../util/networks/networkToastSuppression';

const toastMock = toast as unknown as jest.Mock;
const selectNetworkImageSourceMock =
  selectNetworkImageSource as unknown as jest.Mock;
const actualSelectNetworkImageSource = jest.requireActual<
  typeof import('../../../selectors/networkInfos')
>('../../../selectors/networkInfos').selectNetworkImageSource;

const mockReact = React;
const mockView = View;
const TestStack = createNativeStackNavigator();

// Mock Ramp shell to avoid deep dependency graph in Main mount test
jest.mock('../../../components/UI/Ramp', () => ({
  __esModule: true,
  default: () => mockReact.createElement('RampOrdersMock'),
}));

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '0.0.0'),
  getBuildNumber: jest.fn(() => '0'),
  getUniqueId: jest.fn(() => 'test-device-id'),
  getDeviceId: jest.fn(() => 'test-device-id'),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    toast: Object.assign(jest.fn(), { dismiss: jest.fn() }),
  };
});

jest.mock('../../../selectors/networkInfos', () => {
  const actual = jest.requireActual('../../../selectors/networkInfos');
  return {
    ...actual,
    selectNetworkImageSource: jest.fn(
      (...args: Parameters<typeof actual.selectNetworkImageSource>) =>
        actual.selectNetworkImageSource(...args),
    ),
  };
});

// Mock heavy child components to avoid deep dependency issues
jest.mock('./MainNavigator', () => {
  const MockMainNavigator = () =>
    mockReact.createElement(mockView, { testID: 'mocked-main-navigator' });
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

jest.mock(
  '../../UI/Money/components/MoneyTransactionMonitor/MoneyTransactionMonitor',
  () => () => mockReact.createElement('MoneyTransactionMonitorMock'),
);

jest.mock(
  '../../Views/ProSubscription/components/ProSubscriptionPaymentMonitor/ProSubscriptionPaymentMonitor',
  () => () => mockReact.createElement('ProSubscriptionPaymentMonitorMock'),
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

jest.mock(
  '../../Views/Notifications/PushNotificationOnboarding/PushNotificationOnboardingRoot',
  () => ({
    __esModule: true,
    default: () =>
      mockReact.createElement('PushNotificationOnboardingRootMock'),
  }),
);

jest.mock('../../UI/CliLoginPushNudge', () => ({
  CliLoginPushNudgeListener: () =>
    mockReact.createElement('CliLoginPushNudgeListenerMock'),
}));

jest.mock('../../../util/transaction-controller', () => ({
  updateIncomingTransactions: jest.fn(),
  startIncomingTransactionPolling: jest.fn(),
  stopIncomingTransactionPolling: jest.fn(),
}));

describe('Main', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('mounts the main shell with mocked navigator and shell components', () => {
    const { getByTestId } = renderWithProvider(
      <TestStack.Navigator>
        <TestStack.Screen name="HomeNav" component={Main} />
      </TestStack.Navigator>,
      {
        state: {
          ...initialRootState,
          user: {
            ...initialRootState.user,
            isConnectionRemoved: false,
          },
        },
      },
    );

    expect(getByTestId('mocked-main-navigator')).toBeOnTheScreen();
  });

  describe('network list toasts', () => {
    const addedChainId = '0x539';
    const networkImage = { uri: 'https://example.com/eth.png' };

    beforeEach(() => {
      resetSuppressedNetworkAddedToasts();
      selectNetworkImageSourceMock.mockImplementation(
        actualSelectNetworkImageSource,
      );
    });

    afterEach(() => {
      selectNetworkImageSourceMock.mockImplementation(
        actualSelectNetworkImageSource,
      );
    });

    it('shows added and removed network toasts with and without an image', () => {
      selectNetworkImageSourceMock.mockReturnValue(networkImage);
      const { store } = renderWithProvider(
        <TestStack.Navigator>
          <TestStack.Screen name="HomeNav" component={Main} />
        </TestStack.Navigator>,
        { state: initialRootState },
      );

      const controller =
        store.getState().engine.backgroundState.NetworkController;
      const originalConfigurations = {
        ...controller.networkConfigurationsByChainId,
      };
      const addedNetwork = {
        chainId: addedChainId,
        name: 'Added Network',
        nativeCurrency: 'ETH',
        defaultRpcEndpointIndex: 0,
        rpcEndpoints: [],
        blockExplorerUrls: [],
      };

      const publishConfigurations = (
        networkConfigurationsByChainId: Record<string, unknown>,
      ) => {
        const engineWithState = Engine as unknown as {
          state: Record<string, unknown>;
        };
        engineWithState.state = {
          NetworkController: {
            ...controller,
            networkConfigurationsByChainId,
          },
        };
        act(() => {
          store.dispatch(updateBgState({ key: 'NetworkController' }));
        });
      };

      toastMock.mockClear();
      publishConfigurations({
        ...originalConfigurations,
        [addedChainId]: addedNetwork,
      });

      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: `Added Network ${strings('toast.network_added')}`,
          hasNoTimeout: false,
          showCloseButton: false,
          startAccessory: expect.anything(),
        }),
      );

      selectNetworkImageSourceMock.mockReturnValue(undefined);
      toastMock.mockClear();
      publishConfigurations(originalConfigurations);

      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: `Added Network ${strings('toast.network_removed')}`,
          hasNoTimeout: false,
          showCloseButton: false,
          startAccessory: undefined,
        }),
      );
    });
  });
});
