import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { ToastContext } from '../../../../../component-library/components/Toast';
import Routes from '../../../../../constants/navigation/Routes';
import MoneyAddSocialSheet from './MoneyAddSocialSheet';
import { MoneyAddSocialSheetTestIds } from './MoneyAddSocialSheet.testIds';

const mockAddSocial = jest.fn();
const mockMarkTaskComplete = jest.fn();
const mockShowToast = jest.fn();
const mockNavigate = jest.fn();
const mockCloseBottomSheet = jest.fn((callback?: () => void) => callback?.());
let mockReturnToMoneyHome = false;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn(), navigate: mockNavigate }),
  useRoute: () => ({
    params: mockReturnToMoneyHome
      ? {
          returnToMoneyHome: mockReturnToMoneyHome,
        }
      : undefined,
  }),
}));

jest.mock('../../hooks/useMoneySecurityMethods', () => ({
  useMoneySecurityMethods: () => ({ addSocial: mockAddSocial }),
}));

jest.mock('../../hooks/useMoneyFinishSetup', () => ({
  useMoneyFinishSetup: () => ({
    markTaskComplete: mockMarkTaskComplete,
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
        ref: React.Ref<unknown>,
      ) => {
        useImperativeHandle(ref, () => ({
          onCloseBottomSheet: mockCloseBottomSheet,
        }));
        return <View testID={testID}>{children}</View>;
      },
    ),
  };
});

describe('MoneyAddSocialSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReturnToMoneyHome = false;
  });

  it('adds the selected provider and shows success', () => {
    const { getByTestId, getByText } = renderWithProvider(
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
        <MoneyAddSocialSheet />
      </ToastContext.Provider>,
    );

    expect(getByText('Set up wallet recovery')).toBeOnTheScreen();
    expect(
      getByText(
        "This backs up your Secret Recovery Phrase so you can get back into your wallet without it. The backup is encrypted and split between your device, MetaMask, and a third party, and can't be disconnected later.",
      ),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(MoneyAddSocialSheetTestIds.GOOGLE_BUTTON));

    expect(mockAddSocial).toHaveBeenCalledWith('google');
    expect(mockMarkTaskComplete).toHaveBeenCalledWith('recovery_method');
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [
          expect.objectContaining({ label: 'Google email added' }),
        ],
      }),
    );
  });

  it('returns to Money home after a finish-setup provider is selected', () => {
    mockReturnToMoneyHome = true;
    const { getByTestId } = renderWithProvider(
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
        <MoneyAddSocialSheet />
      </ToastContext.Provider>,
    );

    fireEvent.press(getByTestId(MoneyAddSocialSheetTestIds.APPLE_BUTTON));

    expect(mockAddSocial).toHaveBeenCalledWith('apple');
    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [
          expect.objectContaining({ label: 'Apple account added' }),
        ],
      }),
    );
  });
});
