import React from 'react';
import { fireEvent, act } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { ToastContext } from '../../../../../component-library/components/Toast';
import {
  CardProviderError,
  CardProviderErrorCode,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';
import ImmersveReissueCardSheet from './ImmersveReissueCardSheet';
import { ImmersveReissueCardSheetTestIds } from './ImmersveReissueCardSheet.testIds';
import useCardReissue from '../../hooks/useCardReissue';
import { withBiometricAuth } from '../../util/withBiometricAuth';
import { CardActions } from '../../util/metrics';

const mockOnCloseBottomSheet = jest.fn((cb?: () => void) => cb?.());
const mockGoBack = jest.fn();
const mockShowToast = jest.fn();
const mockToastRef = {
  current: { showToast: mockShowToast, closeToast: jest.fn() },
};
const mockMutateAsync = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn() }),
    useRoute: () => ({ params: { cardId: 'card-1' } }),
  };
});

jest.mock('../../hooks/useCardReissue', () => ({
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
      <ImmersveReissueCardSheet />
    </ToastContext.Provider>,
  );

describe('ImmersveReissueCardSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddProperties.mockReturnValue({ build: mockBuild });
    (useCardReissue as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
    });
  });

  it('keeps the card without authenticating', () => {
    const { getByTestId } = renderSheet();

    fireEvent.press(getByTestId(ImmersveReissueCardSheetTestIds.KEEP_BUTTON));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(withBiometricAuth).not.toHaveBeenCalled();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it.each([
    ['reissued', 'Your new card is ready'],
    ['pending', 'Your new card is still being set up. Check back shortly.'],
  ] as const)(
    'confirms through biometrics and toasts when the result is %s',
    async (result, label) => {
      mockMutateAsync.mockResolvedValue(result);
      const { getByTestId } = renderSheet();

      await act(async () => {
        fireEvent.press(
          getByTestId(ImmersveReissueCardSheetTestIds.CONFIRM_BUTTON),
        );
      });

      expect(withBiometricAuth).toHaveBeenCalledTimes(1);
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          action: CardActions.REISSUE_CARD_CONFIRM,
          provider: 'immersve',
        }),
      );
      expect(mockShowToast).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          labelOptions: [{ label: 'Getting your new card ready' }],
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

  it('toasts when the card cannot be replaced', async () => {
    mockMutateAsync.mockRejectedValue(
      new CardProviderError(
        CardProviderErrorCode.Forbidden,
        'Forbidden on reissueCard',
        403,
        'CARD_REISSUE_NOT_ALLOWED',
      ),
    );
    const { getByTestId } = renderSheet();

    await act(async () => {
      fireEvent.press(
        getByTestId(ImmersveReissueCardSheetTestIds.CONFIRM_BUTTON),
      );
    });

    expect(mockShowToast).toHaveBeenLastCalledWith(
      expect.objectContaining({
        labelOptions: [
          {
            label:
              "This card can't be replaced right now. Contact support if you need help.",
          },
        ],
        hasNoTimeout: false,
      }),
    );
  });

  it('toasts an error when reissue fails', async () => {
    mockMutateAsync.mockRejectedValue(new Error('reissue failed'));
    const { getByTestId } = renderSheet();

    await act(async () => {
      fireEvent.press(
        getByTestId(ImmersveReissueCardSheetTestIds.CONFIRM_BUTTON),
      );
    });

    expect(mockShowToast).toHaveBeenLastCalledWith(
      expect.objectContaining({
        labelOptions: [{ label: "Couldn't replace your card. Try again." }],
        hasNoTimeout: false,
      }),
    );
  });
});
