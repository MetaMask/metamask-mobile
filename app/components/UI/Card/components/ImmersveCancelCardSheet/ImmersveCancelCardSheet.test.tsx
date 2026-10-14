import React from 'react';
import { fireEvent, act } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { ToastContext } from '../../../../../component-library/components/Toast';
import ImmersveCancelCardSheet from './ImmersveCancelCardSheet';
import { ImmersveCancelCardSheetTestIds } from './ImmersveCancelCardSheet.testIds';
import useCardCancel from '../../hooks/useCardCancel';
import { withBiometricAuth } from '../../util/withBiometricAuth';
import { CardActions } from '../../util/metrics';

const mockOnCloseBottomSheet = jest.fn((cb?: () => void) => cb?.());
const mockGoBack = jest.fn();
const mockShowToast = jest.fn();
const mockToastRef = {
  current: { showToast: mockShowToast, closeToast: jest.fn() },
};
const mockMutate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn() }),
    useRoute: () => ({ params: { cardId: 'card-1' } }),
  };
});

jest.mock('../../hooks/useCardCancel', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../util/withBiometricAuth', () => ({
  withBiometricAuth: jest.fn(
    async ({ onSuccess }: { onSuccess: () => void }) => {
      await onSuccess();
    },
  ),
}));

jest.mock('../../../../../core/Authentication/hooks/useAuthentication', () => ({
  __esModule: true,
  default: () => ({ reauthenticate: jest.fn() }),
}));

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn();
const mockBuild = jest.fn();
jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: jest.fn(() => ({
      addProperties: mockAddProperties.mockReturnValue({ build: mockBuild }),
    })),
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  const MockBottomSheet = ReactActual.forwardRef(
    (
      { children, testID }: { children: React.ReactNode; testID?: string },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: mockOnCloseBottomSheet,
        onOpenBottomSheet: jest.fn(),
      }));
      return ReactActual.createElement(View, { testID }, children);
    },
  );

  return {
    ...actual,
    BottomSheet: MockBottomSheet,
  };
});

const renderSheet = () =>
  renderWithProvider(
    <ToastContext.Provider value={{ toastRef: mockToastRef }}>
      <ImmersveCancelCardSheet />
    </ToastContext.Provider>,
  );

describe('ImmersveCancelCardSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddProperties.mockReturnValue({ build: mockBuild });
    (useCardCancel as jest.Mock).mockReturnValue({ mutate: mockMutate });
  });

  it('keeps the card without authenticating', () => {
    const { getByTestId } = renderSheet();

    fireEvent.press(getByTestId(ImmersveCancelCardSheetTestIds.KEEP_BUTTON));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(withBiometricAuth).not.toHaveBeenCalled();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it.each([
    ['cancelled', 'Card cancelled'],
    ['pending', 'Cancellation is still in progress'],
  ] as const)(
    'confirms through biometrics and toasts when the result is %s',
    async (result, label) => {
      mockMutate.mockImplementation(
        (_vars: undefined, options: { onSuccess: (value: string) => void }) => {
          options.onSuccess(result);
        },
      );
      const { getByTestId } = renderSheet();

      await act(async () => {
        fireEvent.press(
          getByTestId(ImmersveCancelCardSheetTestIds.CONFIRM_BUTTON),
        );
      });

      expect(withBiometricAuth).toHaveBeenCalledTimes(1);
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          action: CardActions.CANCEL_CARD_CONFIRM,
          provider: 'immersve',
        }),
      );
      expect(mockShowToast).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          labelOptions: [{ label: 'Cancelling your card' }],
          hasNoTimeout: true,
        }),
      );
      expect(mockShowToast).toHaveBeenLastCalledWith(
        expect.objectContaining({
          labelOptions: [{ label }],
          hasNoTimeout: false,
        }),
      );
    },
  );

  it('toasts an error when cancellation fails', async () => {
    mockMutate.mockImplementation(
      (_vars: undefined, options: { onError: () => void }) => {
        options.onError();
      },
    );
    const { getByTestId } = renderSheet();

    await act(async () => {
      fireEvent.press(
        getByTestId(ImmersveCancelCardSheetTestIds.CONFIRM_BUTTON),
      );
    });

    expect(mockShowToast).toHaveBeenLastCalledWith(
      expect.objectContaining({
        labelOptions: [{ label: "Couldn't cancel your card. Try again." }],
        hasNoTimeout: false,
      }),
    );
  });
});
