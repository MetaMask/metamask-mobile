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
let mockShowAuthenticatorAlternative = false;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn(), navigate: mockNavigate }),
  useRoute: () => ({
    params:
      mockReturnToMoneyHome || mockShowAuthenticatorAlternative
        ? {
            returnToMoneyHome: mockReturnToMoneyHome,
            showAuthenticatorAlternative: mockShowAuthenticatorAlternative,
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
    mockShowAuthenticatorAlternative = false;
  });

  it('adds the selected provider and shows success', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
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

    expect(
      queryByTestId(MoneyAddSocialSheetTestIds.AUTHENTICATOR_BUTTON),
    ).toBeNull();
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

  it('offers authenticator setup only from finish setup recovery', () => {
    mockShowAuthenticatorAlternative = true;
    const { getByTestId, getByText } = renderWithProvider(
      <MoneyAddSocialSheet />,
    );

    expect(
      getByText(
        "Use this as a backup method to access your wallet in case you lose your Secret Recovery Phrase. You won't be able to disconnect this later.",
      ),
    ).toBeOnTheScreen();
    expect(getByText('or')).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(MoneyAddSocialSheetTestIds.AUTHENTICATOR_BUTTON),
    );
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.AUTHENTICATOR, {
      entryPoint: 'finish_setup',
    });
  });
});
