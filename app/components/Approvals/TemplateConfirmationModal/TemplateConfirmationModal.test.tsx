jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const deprecatedPropTypes = jest.requireActual('deprecated-react-native-prop-types');

  const mockSettingsManager: {
    settings: {
      AppleLocale: string;
      AppleLanguages: string[];
      [key: string]: unknown;
    };
    getConstants: () => { settings: { AppleLocale: string; AppleLanguages: string[]; [key: string]: unknown } };
    setValues: jest.Mock;
    deleteValues: jest.Mock;
  } = {
    settings: {
      AppleLocale: 'en_US',
      AppleLanguages: ['en'],
    },
    getConstants: () => ({
      settings: mockSettingsManager.settings,
    }),
    setValues: jest.fn(),
    deleteValues: jest.fn(),
  };

  RN.NativeModules.SettingsManager = mockSettingsManager;

  return {
    ...RN,
    ColorPropType: deprecatedPropTypes.ColorPropType,
    EdgeInsetsPropType: deprecatedPropTypes.EdgeInsetsPropType,
    PointPropType: deprecatedPropTypes.PointPropType,
    Settings: {
      get: jest.fn(
        (key: string) =>
          mockSettingsManager.settings[
            key as keyof typeof mockSettingsManager.settings
          ],
      ),
      set: jest.fn((settings: Partial<typeof mockSettingsManager.settings>) => {
        Object.assign(mockSettingsManager.settings, settings);
      }),
      watchKeys: jest.fn(() => ({ remove: jest.fn() })),
    },
    TurboModuleRegistry: {
      getEnforcing: jest.fn((name: string) => {
        if (name === 'SettingsManager') {
          return mockSettingsManager;
        }
        return RN.TurboModuleRegistry.getEnforcing(name);
      }),
    },
    DeviceEventEmitter: {
      ...RN.DeviceEventEmitter,
      removeListener: jest.fn(),
    },
  };
});

jest.mock('react-native/Libraries/Utilities/warnOnce', () => jest.fn());

import React from 'react';
import {
  render,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@react-navigation/native';
import configureStore from 'redux-mock-store';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import TemplateConfirmationModal from './TemplateConfirmationModal';
import { RootState } from '../../../reducers';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';

jest.mock('react-native/Libraries/LogBox/LogBox', () => ({
  // Removed unused functions
}));

jest.mock('../../Views/confirmations/hooks/useApprovalRequest');

// Removed unused SettingsManagerType interface

jest.mock(
  '@react-native-clipboard/clipboard',
  () => ({
    __esModule: true,
    default: {
      setString: jest.fn(),
      getString: jest.fn(),
      hasString: jest.fn(),
    },
  }),
  { virtual: true },
);

jest.mock(
  '@react-native-community/push-notification-ios',
  () => ({
    __esModule: true,
    default: {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      requestPermissions: jest.fn(),
      abandonPermissions: jest.fn(),
      checkPermissions: jest.fn(),
      getInitialNotification: jest.fn(),
      presentLocalNotification: jest.fn(),
      scheduleLocalNotification: jest.fn(),
      cancelAllLocalNotifications: jest.fn(),
      removeAllDeliveredNotifications: jest.fn(),
      getDeliveredNotifications: jest.fn(),
      removeDeliveredNotifications: jest.fn(),
      setApplicationIconBadgeNumber: jest.fn(),
      getApplicationIconBadgeNumber: jest.fn(),
      cancelLocalNotifications: jest.fn(),
      getScheduledLocalNotifications: jest.fn(),
      addNotificationRequest: jest.fn(),
    },
  }),
  { virtual: true },
);

jest.mock('@react-native-community/slider', () => 'Slider');
jest.mock('@react-native-picker/picker', () => 'Picker');
jest.mock('@react-native-masked-view/masked-view', () => 'MaskedView');

jest.mock(
  '../../../components/Views/confirmations/components/Approval/TemplateConfirmation/TemplateConfirmation',
  () => ({
    __esModule: true,
    default: jest.fn(() => () => null),
  }),
);

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: {
    View: jest.fn(() => null),
  },
  useSharedValue: jest.fn(),
  useAnimatedStyle: jest.fn(),
  withTiming: jest.fn(),
}));

const mockApprovalRequest = (type: string) => {
  (useApprovalRequest as jest.Mock).mockReturnValue({
    approvalRequest: {
      type,
      requestData: {},
      origin: 'test',
      id: 'test-id',
    },
    pageMeta: {},
    onConfirm: jest.fn(),
    onReject: jest.fn(),
  });
};

describe('TemplateConfirmationModal', () => {
  const testMockStore = configureStore<Partial<RootState>>()({
    // Add necessary initial state
  });

  const testMockTheme = {
    dark: false,
    colors: {
      background: '#FFFFFF',
      text: '#000000',
      primary: '#000000',
      card: '#FFFFFF',
      border: '#000000',
      notification: '#000000',
    },
  };

  const customRender = (ui: React.ReactElement) =>
    render(
      <Provider store={testMockStore}>
        <ThemeProvider value={testMockTheme}>{ui}</ThemeProvider>
      </Provider>,
    );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders if approval type is success result', async () => {
    mockApprovalRequest(ApprovalTypes.RESULT_SUCCESS);
    const { getByTestId } = customRender(<TemplateConfirmationModal />);

    await waitFor(() => {
      expect(getByTestId('success-message')).toBeTruthy();
      expect(getByTestId('confirm-button')).toBeTruthy();
      expect(getByTestId('cancel-button')).toBeTruthy();
    }, { timeout: 5000 });
  });

  it('renders if approval type is error result', async () => {
    mockApprovalRequest(ApprovalTypes.RESULT_ERROR);

    const { getByTestId, queryByTestId } = customRender(
      <TemplateConfirmationModal />,
    );

    await waitFor(() => {
      expect(getByTestId('error-message')).toBeTruthy();
      expect(getByTestId('error-description')).toBeTruthy();
      expect(getByTestId('dismiss-button')).toBeTruthy();
      expect(queryByTestId('cancel-button')).toBeNull();
    }, { timeout: 5000 });
  });

  it('renders nothing if no approval request', () => {
    const mockUseApprovalRequest = useApprovalRequest as jest.MockedFunction<
      typeof useApprovalRequest
    >;
    mockUseApprovalRequest.mockReturnValue({
      approvalRequest: undefined,
      pageMeta: {},
      onConfirm: jest.fn(),
      onReject: jest.fn(),
    });

    const { queryByTestId } = customRender(<TemplateConfirmationModal />);

    expect(queryByTestId('success-message')).toBeNull();
    expect(queryByTestId('error-message')).toBeNull();
    expect(queryByTestId('confirm-button')).toBeNull();
    expect(queryByTestId('dismiss-button')).toBeNull();
    expect(queryByTestId('cancel-button')).toBeNull();
  });

  it('renders nothing if incorrect approval request type', async () => {
    mockApprovalRequest(ApprovalTypes.ADD_ETHEREUM_CHAIN);
    const { queryByTestId } = customRender(<TemplateConfirmationModal />);

    await waitFor(() => {
      expect(queryByTestId('success-message')).toBeNull();
      expect(queryByTestId('error-message')).toBeNull();
      expect(queryByTestId('confirm-button')).toBeNull();
      expect(queryByTestId('dismiss-button')).toBeNull();
    });
  });

  it('calls onConfirm when confirm button is pressed', async () => {
    const mockOnConfirm = jest.fn();
    mockApprovalRequest(ApprovalTypes.RESULT_SUCCESS);
    (useApprovalRequest as jest.Mock).mockReturnValue({
      approvalRequest: {
        type: ApprovalTypes.RESULT_SUCCESS,
        requestData: {},
        origin: 'test',
        id: 'test-id',
        time: Date.now(),
        requestState: { metadata: {} },
        expectsResult: false,
      },
      pageMeta: {},
      onConfirm: mockOnConfirm,
      onReject: jest.fn(),
    });

    const { getByTestId, debug } = customRender(<TemplateConfirmationModal />);
    debug(); // This will log the rendered component structure

    await waitFor(() => {
      const confirmButton = getByTestId('confirm-button');
      expect(confirmButton).toBeTruthy();
    }, { timeout: 10000 });

    const confirmButton = getByTestId('confirm-button');
    await act(async () => {
      fireEvent.press(confirmButton);
    });

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    }, { timeout: 10000 });
  }, 20000);
});
