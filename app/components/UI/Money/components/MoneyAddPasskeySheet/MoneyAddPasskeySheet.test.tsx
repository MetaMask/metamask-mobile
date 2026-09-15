import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { ToastContext } from '../../../../../component-library/components/Toast';
import MoneyAddPasskeySheet from './MoneyAddPasskeySheet';
import { MoneyAddPasskeySheetTestIds } from './MoneyAddPasskeySheet.testIds';

const mockRegisterPasskey = jest.fn();
const mockShowToast = jest.fn();
const mockOnCloseBottomSheet = jest.fn((callback?: () => void) => callback?.());
const mockGoBack = jest.fn();
const mockAuthenticateAsync = jest.fn();
const mockIsEmulator = jest.fn();
let mockReturnToMoneyHome = true;

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
  }),
  useRoute: () => ({
    params: { returnToMoneyHome: mockReturnToMoneyHome },
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
    mockIsEmulator.mockResolvedValue(false);
    mockAuthenticateAsync.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('runs system Face ID, signing, and completion states', async () => {
    const { getByTestId, getByText } = renderSheet();

    await act(async () => Promise.resolve());
    expect(mockAuthenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ disableDeviceFallback: true }),
    );
    expect(getByText('Create a passkey?')).toBeOnTheScreen();

    fireEvent.press(getByTestId(MoneyAddPasskeySheetTestIds.ADD_BUTTON));
    expect(getByText('Signing in')).toBeOnTheScreen();

    act(() => jest.advanceTimersByTime(1200));
    expect(getByText('Done')).toBeOnTheScreen();

    act(() => jest.advanceTimersByTime(900));
    expect(mockRegisterPasskey).toHaveBeenCalledWith('one_password');
    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [{ label: 'Passkey added', isBold: true }],
      }),
    );
  });

  it('stays on the passkeys page when opened from security settings', async () => {
    mockReturnToMoneyHome = false;
    const { getByTestId } = renderSheet();

    await act(async () => Promise.resolve());
    fireEvent.press(getByTestId(MoneyAddPasskeySheetTestIds.ADD_BUTTON));
    act(() => jest.advanceTimersByTime(1200));
    act(() => jest.advanceTimersByTime(900));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalled();
  });

  it('allows choosing another passkey provider', async () => {
    const { getByTestId, getByText } = renderSheet();

    await act(async () => Promise.resolve());
    fireEvent.press(
      getByTestId(MoneyAddPasskeySheetTestIds.MORE_OPTIONS_BUTTON),
    );
    expect(getByText('Choose where to save your passkey')).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(`${MoneyAddPasskeySheetTestIds.CONTAINER}-option-passwords`),
    );
    fireEvent.press(getByTestId(MoneyAddPasskeySheetTestIds.ADD_BUTTON));
    act(() => jest.advanceTimersByTime(1200));
    act(() => jest.advanceTimersByTime(900));

    expect(mockRegisterPasskey).toHaveBeenCalledWith('passwords');
  });

  it('skips the blocking system prompt on the simulator', async () => {
    mockIsEmulator.mockResolvedValue(true);
    const { getByText } = renderSheet();

    await act(async () => Promise.resolve());

    expect(mockAuthenticateAsync).not.toHaveBeenCalled();
    expect(getByText('Create a passkey?')).toBeOnTheScreen();
  });
});
