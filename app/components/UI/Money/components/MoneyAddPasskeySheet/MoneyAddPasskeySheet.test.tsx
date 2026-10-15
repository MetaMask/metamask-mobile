import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { ToastContext } from '../../../../../component-library/components/Toast';
import Routes from '../../../../../constants/navigation/Routes';
import MoneyAddPasskeySheet from './MoneyAddPasskeySheet';
import { MoneyAddPasskeySheetTestIds } from './MoneyAddPasskeySheet.testIds';

const mockRegisterPasskey = jest.fn();
const mockShowToast = jest.fn();
const mockOnCloseBottomSheet = jest.fn((callback?: () => void) => callback?.());
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockAuthenticateAsync = jest.fn();
const mockIsEmulator = jest.fn();
let mockReturnToMoneyHome = true;
let mockReturnToSecurity = false;
let mockShowAdditionalFactorPrompt = false;
let mockContinueToAuthenticatorSetup = false;

jest.mock('expo-local-authentication', () => ({
  authenticateAsync: (...args: unknown[]) => mockAuthenticateAsync(...args),
}));

jest.mock('react-native-device-info', () => ({
  isEmulator: () => mockIsEmulator(),
}));

jest.mock('../../hooks/useMoneyFinishSetup', () => ({
  useMoneyFinishSetup: () => ({
    registerPasskey: mockRegisterPasskey,
  }),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: {
      continueToAuthenticatorSetup: mockContinueToAuthenticatorSetup,
      returnToMoneyHome: mockReturnToMoneyHome,
      returnToSecurity: mockReturnToSecurity,
      showAdditionalFactorPrompt: mockShowAdditionalFactorPrompt,
    },
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    ...actual,
    BottomSheet: forwardRef(
      (
        { children, testID }: { children: React.ReactNode; testID?: string },
        ref: React.Ref<{
          onCloseBottomSheet: (callback?: () => void) => void;
        }>,
      ) => {
        useImperativeHandle(ref, () => ({
          onCloseBottomSheet: mockOnCloseBottomSheet,
        }));
        return <View testID={testID}>{children}</View>;
      },
    ),
    BottomSheetHeader: ({ children }: { children?: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

const renderSheet = () =>
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
      <MoneyAddPasskeySheet />
    </ToastContext.Provider>,
  );

describe('MoneyAddPasskeySheet', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockReturnToMoneyHome = true;
    mockReturnToSecurity = false;
    mockShowAdditionalFactorPrompt = false;
    mockContinueToAuthenticatorSetup = false;
    mockIsEmulator.mockResolvedValue(false);
    mockAuthenticateAsync.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('runs system Face ID, signing, and completion states', async () => {
    const { getByTestId, getByText } = renderSheet();

    expect(getByText('Add a passkey?')).toBeOnTheScreen();
    fireEvent.press(getByTestId(MoneyAddPasskeySheetTestIds.ADD_BUTTON));
    expect(getByText('Use Face ID to sign in?')).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(getByTestId(MoneyAddPasskeySheetTestIds.ADD_BUTTON));
      await Promise.resolve();
    });
    expect(mockAuthenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ disableDeviceFallback: true }),
    );
    expect(getByText('Signing in')).toBeOnTheScreen();

    act(() => jest.advanceTimersByTime(1200));
    expect(getByText('Done')).toBeOnTheScreen();

    act(() => jest.advanceTimersByTime(900));
    expect(mockRegisterPasskey).toHaveBeenCalledWith('one_password');
    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('stays on the passkeys page when opened from security settings', async () => {
    mockReturnToMoneyHome = false;
    const { getByTestId } = renderSheet();

    fireEvent.press(getByTestId(MoneyAddPasskeySheetTestIds.ADD_BUTTON));
    await act(async () => {
      fireEvent.press(getByTestId(MoneyAddPasskeySheetTestIds.ADD_BUTTON));
      await Promise.resolve();
    });
    act(() => jest.advanceTimersByTime(1200));
    act(() => jest.advanceTimersByTime(900));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('returns to 2-step verification with a success toast after settings setup', async () => {
    mockReturnToMoneyHome = false;
    mockReturnToSecurity = true;
    const { getByTestId } = renderSheet();

    fireEvent.press(getByTestId(MoneyAddPasskeySheetTestIds.ADD_BUTTON));
    await act(async () => {
      fireEvent.press(getByTestId(MoneyAddPasskeySheetTestIds.ADD_BUTTON));
      await Promise.resolve();
    });
    act(() => jest.advanceTimersByTime(1200));
    act(() => jest.advanceTimersByTime(900));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MANAGE_SECURITY, {
      successToast: 'Passkey added',
    });
  });

  it('opens the optional authenticator factor after finish setup', async () => {
    mockShowAdditionalFactorPrompt = true;
    const { getByTestId } = renderSheet();

    fireEvent.press(getByTestId(MoneyAddPasskeySheetTestIds.ADD_BUTTON));
    await act(async () => {
      fireEvent.press(getByTestId(MoneyAddPasskeySheetTestIds.ADD_BUTTON));
      await Promise.resolve();
    });
    act(() => jest.advanceTimersByTime(1200));
    act(() => jest.advanceTimersByTime(900));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.AUTHENTICATOR, {
      entryPoint: 'additional_factor',
    });
  });

  it('continues to authenticator setup from the 2-step setup flow', async () => {
    mockContinueToAuthenticatorSetup = true;
    mockReturnToMoneyHome = false;
    const { getByTestId } = renderSheet();

    fireEvent.press(getByTestId(MoneyAddPasskeySheetTestIds.ADD_BUTTON));
    await act(async () => {
      fireEvent.press(getByTestId(MoneyAddPasskeySheetTestIds.ADD_BUTTON));
      await Promise.resolve();
    });
    act(() => jest.advanceTimersByTime(1200));
    act(() => jest.advanceTimersByTime(900));

    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.AUTHENTICATOR, {
      entryPoint: 'protect_money',
    });
  });

  it('allows choosing another passkey provider', async () => {
    const { getByTestId } = renderSheet();

    fireEvent.press(
      getByTestId(`${MoneyAddPasskeySheetTestIds.CONTAINER}-option-passwords`),
    );
    fireEvent.press(getByTestId(MoneyAddPasskeySheetTestIds.ADD_BUTTON));
    await act(async () => {
      fireEvent.press(getByTestId(MoneyAddPasskeySheetTestIds.ADD_BUTTON));
      await Promise.resolve();
    });
    act(() => jest.advanceTimersByTime(1200));
    act(() => jest.advanceTimersByTime(900));

    expect(mockRegisterPasskey).toHaveBeenCalledWith('passwords');
  });

  it('skips the blocking system prompt on the simulator', async () => {
    mockIsEmulator.mockResolvedValue(true);
    const { getByTestId, getByText } = renderSheet();

    expect(getByText('Add a passkey?')).toBeOnTheScreen();
    fireEvent.press(getByTestId(MoneyAddPasskeySheetTestIds.ADD_BUTTON));
    await act(async () => {
      fireEvent.press(getByTestId(MoneyAddPasskeySheetTestIds.ADD_BUTTON));
      await Promise.resolve();
    });

    expect(mockAuthenticateAsync).not.toHaveBeenCalled();
    expect(getByText('Signing in')).toBeOnTheScreen();
  });
});
