import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { ToastContext } from '../../../../component-library/components/Toast';
import PushNotificationOnboarding from '.';

const mockMarkPrePromptShown = jest.fn().mockResolvedValue(undefined);
const mockDismissPrePrompt = jest.fn();
const mockUsePushPrePromptVariant = jest.fn(() => ({
  variant: null,
  markShown: mockMarkPrePromptShown,
  dismiss: mockDismissPrePrompt,
}));
const mockEnableNotifications = jest.fn();
const mockShowToast = jest.fn();

jest.mock(
  '../../../../util/notifications/hooks/usePushPrePromptVariant',
  () => ({
    usePushPrePromptVariant: () => mockUsePushPrePromptVariant(),
  }),
);

jest.mock('../../../../util/notifications/hooks/useNotifications', () => ({
  useEnableNotifications: () => ({
    enableNotifications: mockEnableNotifications,
  }),
}));

jest.mock('./NewUserSheet', () => ({
  __esModule: true,
  default: (props: {
    isVisible: boolean;
    onClose: (hasPendingAction?: boolean) => void;
    onYes: () => void;
    onNotNow: () => void;
  }) => {
    const MockReact = jest.requireActual('react');
    const { Pressable: MockPressable, View: MockView } =
      jest.requireActual('react-native');

    return props.isVisible
      ? MockReact.createElement(
          MockView,
          { testID: 'mock-push-permission-sheet' },
          MockReact.createElement(MockPressable, {
            testID: 'mock-push-permission-dismiss',
            onPress: props.onClose,
          }),
          MockReact.createElement(MockPressable, {
            testID: 'mock-push-permission-action-close',
            onPress: () => props.onClose(true),
          }),
          MockReact.createElement(MockPressable, {
            testID: 'mock-push-permission-yes',
            onPress: props.onYes,
          }),
          MockReact.createElement(MockPressable, {
            testID: 'mock-push-permission-not-now',
            onPress: props.onNotNow,
          }),
        )
      : null;
  },
}));

jest.mock('./ExistingUserSheet', () => ({
  __esModule: true,
  default: (props: {
    isVisible: boolean;
    onConfirm: () => void;
    onNotNow: () => void;
  }) => {
    const MockReact = jest.requireActual('react');
    const { Pressable: MockPressable, View: MockView } =
      jest.requireActual('react-native');

    return props.isVisible
      ? MockReact.createElement(
          MockView,
          { testID: 'mock-marketing-consent-sheet' },
          MockReact.createElement(MockPressable, {
            testID: 'mock-marketing-consent-confirm',
            onPress: props.onConfirm,
          }),
          MockReact.createElement(MockPressable, {
            testID: 'mock-marketing-consent-not-now',
            onPress: props.onNotNow,
          }),
        )
      : null;
  },
}));

const renderPushNotificationOnboarding = () =>
  renderWithProvider(
    <ToastContext.Provider
      value={{
        toastRef: {
          current: {
            showToast: mockShowToast,
            closeToast: jest.fn(),
          },
        },
      }}
    >
      <PushNotificationOnboarding />
    </ToastContext.Provider>,
    {
      state: {
        security: {
          dataCollectionForMarketing: false,
        },
      },
    },
  );

describe('PushNotificationOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePushPrePromptVariant.mockReturnValue({
      variant: null,
      markShown: mockMarkPrePromptShown,
      dismiss: mockDismissPrePrompt,
    });
    mockEnableNotifications.mockResolvedValue(false);
  });

  it('marks the prompt as shown when the push permission sheet renders', async () => {
    mockUsePushPrePromptVariant.mockReturnValue({
      variant: 'push_permission',
      markShown: mockMarkPrePromptShown,
      dismiss: mockDismissPrePrompt,
    });

    renderPushNotificationOnboarding();

    await waitFor(() => {
      expect(mockMarkPrePromptShown).toHaveBeenCalledTimes(1);
    });
  });

  it('requests notifications and grants marketing consent when Yes is pressed', async () => {
    mockEnableNotifications.mockResolvedValue(true);
    mockUsePushPrePromptVariant.mockReturnValue({
      variant: 'push_permission',
      markShown: mockMarkPrePromptShown,
      dismiss: mockDismissPrePrompt,
    });
    const { getByTestId, store } = renderPushNotificationOnboarding();

    fireEvent.press(getByTestId('mock-push-permission-yes'));

    await waitFor(() => {
      expect(mockEnableNotifications).toHaveBeenCalledTimes(1);
    });
    expect(mockDismissPrePrompt).toHaveBeenCalledTimes(1);
    expect(store.getState().security.dataCollectionForMarketing).toBe(true);
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [{ label: 'Notifications enabled' }],
      }),
    );
  });

  it('does not request notifications when Not now is pressed', () => {
    mockUsePushPrePromptVariant.mockReturnValue({
      variant: 'push_permission',
      markShown: mockMarkPrePromptShown,
      dismiss: mockDismissPrePrompt,
    });
    const { getByTestId } = renderPushNotificationOnboarding();

    fireEvent.press(getByTestId('mock-push-permission-not-now'));

    expect(mockEnableNotifications).not.toHaveBeenCalled();
    expect(mockDismissPrePrompt).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [
          {
            label:
              'You can enable notifications any time in Settings > Notifications',
          },
        ],
      }),
    );
  });

  it('sets marketing consent when the marketing prompt is confirmed', () => {
    mockUsePushPrePromptVariant.mockReturnValue({
      variant: 'marketing_consent',
      markShown: mockMarkPrePromptShown,
      dismiss: mockDismissPrePrompt,
    });
    const { getByTestId, store } = renderPushNotificationOnboarding();

    fireEvent.press(getByTestId('mock-marketing-consent-confirm'));

    expect(store.getState().security.dataCollectionForMarketing).toBe(true);
    expect(mockEnableNotifications).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [{ label: 'Personalized updates enabled' }],
      }),
    );
  });

  it('does not dismiss when the sheet closes for a pending button action', () => {
    mockUsePushPrePromptVariant.mockReturnValue({
      variant: 'push_permission',
      markShown: mockMarkPrePromptShown,
      dismiss: mockDismissPrePrompt,
    });
    const { getByTestId } = renderPushNotificationOnboarding();

    fireEvent.press(getByTestId('mock-push-permission-action-close'));

    expect(mockDismissPrePrompt).not.toHaveBeenCalled();
  });

  it('dismisses when the sheet is closed directly', () => {
    mockUsePushPrePromptVariant.mockReturnValue({
      variant: 'push_permission',
      markShown: mockMarkPrePromptShown,
      dismiss: mockDismissPrePrompt,
    });
    const { getByTestId } = renderPushNotificationOnboarding();

    fireEvent.press(getByTestId('mock-push-permission-dismiss'));

    expect(mockDismissPrePrompt).toHaveBeenCalledTimes(1);
  });
});
