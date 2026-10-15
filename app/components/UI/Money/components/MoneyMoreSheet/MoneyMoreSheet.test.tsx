import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import MoneyMoreSheet from './MoneyMoreSheet';
import { MoneyMoreSheetTestIds } from './MoneyMoreSheet.testIds';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockOnCloseBottomSheet = jest.fn((callback?: () => void) => callback?.());
const mockSetTransactionVerificationEnabled = jest.fn();
const mockOpenSupportWithConsent = jest.fn();
const mockTrackBottomSheetViewed = jest.fn();
const mockTrackSurfaceClicked = jest.fn();
let mockTransactionVerificationEnabled = true;
let mockPasskeyCount = 1;
let mockIsEmailVerified = false;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const MockBottomSheet = forwardRef(
    (
      { children, testID }: { children: React.ReactNode; testID?: string },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
      useImperativeHandle(ref, () => ({
        onCloseBottomSheet: mockOnCloseBottomSheet,
        onOpenBottomSheet: jest.fn(),
      }));
      return <View testID={testID}>{children}</View>;
    },
  );

  return {
    ...actual,
    BottomSheet: MockBottomSheet,
    BottomSheetHeader: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: () => ({
    trackBottomSheetViewed: mockTrackBottomSheetViewed,
    trackSurfaceClicked: mockTrackSurfaceClicked,
  }),
}));

jest.mock('../../hooks/useMoneyFinishSetup', () => ({
  useMoneyFinishSetup: () => ({
    passkeyCount: mockPasskeyCount,
    isEmailVerified: mockIsEmailVerified,
  }),
}));

jest.mock('../../hooks/useMoneySecurityMethods', () => ({
  useMoneySecurityMethods: () => ({
    isAuthenticatorAdded: false,
    isSmsAdded: false,
    isTransactionVerificationEnabled: mockTransactionVerificationEnabled,
    setTransactionVerificationEnabled: mockSetTransactionVerificationEnabled,
  }),
}));

jest.mock('../../../../hooks/useSupportConsent', () => ({
  useSupportConsent: () => ({
    openSupportWithConsent: mockOpenSupportWithConsent,
  }),
}));

describe('MoneyMoreSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransactionVerificationEnabled = true;
    mockPasskeyCount = 1;
    mockIsEmailVerified = false;
  });

  it('renders only the four reference items', () => {
    const { getByText, queryByTestId } = renderWithProvider(<MoneyMoreSheet />);

    expect(getByText('2-step verification')).toBeOnTheScreen();
    expect(getByText('Protect your Money transactions.')).toBeOnTheScreen();
    expect(getByText('How it works')).toBeOnTheScreen();
    expect(getByText('Benefit')).toBeOnTheScreen();
    expect(getByText('Contact support')).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyMoreSheetTestIds.MANAGE_SECURITY_OPTION),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(MoneyMoreSheetTestIds.REFRESH_OPTION),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(MoneyMoreSheetTestIds.TWO_WEEKS_LATER_OPTION),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(MoneyMoreSheetTestIds.FINISH_SETUP_OPTION),
    ).not.toBeOnTheScreen();
  });

  it('shows the saved 2-step verification state', () => {
    const { getByTestId } = renderWithProvider(<MoneyMoreSheet />);

    expect(
      getByTestId(MoneyMoreSheetTestIds.TWO_STEP_VERIFICATION_SWITCH),
    ).toHaveProp('value', true);
  });

  it('requires verification before enabling with an existing method', () => {
    mockTransactionVerificationEnabled = false;
    const { getByTestId } = renderWithProvider(<MoneyMoreSheet />);

    fireEvent(
      getByTestId(MoneyMoreSheetTestIds.TWO_STEP_VERIFICATION_SWITCH),
      'valueChange',
      true,
    );

    expect(mockSetTransactionVerificationEnabled).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.SECURITY_VERIFICATION_SHEET,
      params: {
        action: { type: 'enable-transaction-verification' },
      },
    });
  });

  it('opens MFA setup before enabling when no method exists', () => {
    mockTransactionVerificationEnabled = false;
    mockPasskeyCount = 0;
    const { getByTestId } = renderWithProvider(<MoneyMoreSheet />);

    fireEvent(
      getByTestId(MoneyMoreSheetTestIds.TWO_STEP_VERIFICATION_SWITCH),
      'valueChange',
      true,
    );

    expect(mockSetTransactionVerificationEnabled).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.SECURITY_SETUP);
  });

  it('starts the disable flow with a return to Money', () => {
    const { getByTestId } = renderWithProvider(<MoneyMoreSheet />);

    fireEvent(
      getByTestId(MoneyMoreSheetTestIds.TWO_STEP_VERIFICATION_SWITCH),
      'valueChange',
      false,
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.SECURITY_INFO_SHEET,
      params: {
        variant: 'disable-transaction-verification',
        returnToMoneyHome: true,
      },
    });
  });

  it('opens How it works', () => {
    const { getByTestId } = renderWithProvider(<MoneyMoreSheet />);

    fireEvent.press(getByTestId(MoneyMoreSheetTestIds.HOW_IT_WORKS_OPTION));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.HOW_IT_WORKS);
  });

  it('opens Benefit in the in-app browser', () => {
    const { getByTestId } = renderWithProvider(<MoneyMoreSheet />);

    fireEvent.press(getByTestId(MoneyMoreSheetTestIds.WHAT_YOU_GET_OPTION));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.BROWSER.HOME,
      expect.objectContaining({
        screen: Routes.BROWSER.VIEW,
      }),
    );
  });

  it('opens the support consent flow', () => {
    const { getByTestId } = renderWithProvider(<MoneyMoreSheet />);

    fireEvent.press(getByTestId(MoneyMoreSheetTestIds.CONTACT_SUPPORT_OPTION));

    expect(mockOpenSupportWithConsent).toHaveBeenCalled();
  });
});
