import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider, {
  type DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import Routes from '../../../../../constants/navigation/Routes';
import { STEPPER_IDS } from '../../hooks/useOnboardingStep';
import MoneySecurityView from './MoneySecurityView';
import { MoneySecurityViewTestIds } from './MoneySecurityView.testIds';

const mockNavigate = jest.fn();
const mockSetParams = jest.fn();
const mockShowSuccessToast = jest.fn();
let mockRouteParams: { successToast?: string } | undefined;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (callback: () => void) => callback(),
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: mockNavigate,
    setParams: mockSetParams,
  }),
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('../../hooks/useMoneySecurityToast', () => ({
  useMoneySecurityToast: () => mockShowSuccessToast,
}));

const stateWithProgress = (
  progress: Record<string, number>,
): DeepPartial<RootState> =>
  ({
    user: {
      onboardingStepperProgress: progress,
    },
  }) as DeepPartial<RootState>;

describe('MoneySecurityView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = undefined;
  });

  it('matches the 2-step verification settings content', () => {
    const { getAllByText, getByText } = renderWithProvider(
      <MoneySecurityView />,
    );

    expect(getAllByText('2-step verification')).toHaveLength(2);
    expect(
      getByText('Require additional verification for Money transactions.'),
    ).toBeOnTheScreen();
    expect(getByText('Passkeys')).toBeOnTheScreen();
    expect(getByText('Email')).toBeOnTheScreen();
    expect(getByText('Authenticator app')).toBeOnTheScreen();
    expect(getByText('SMS')).toBeOnTheScreen();
  });

  it('shows Add only for methods that have not been added', () => {
    const progress = {
      [STEPPER_IDS.MONEY_PASSKEY_COUNT]: 1,
      [STEPPER_IDS.MONEY_EMAIL_VERIFIED]: 1,
      [STEPPER_IDS.MONEY_SECURITY_AUTHENTICATOR]: 1,
      [STEPPER_IDS.MONEY_SECURITY_SMS_CREATED_AT]: Date.now(),
      [STEPPER_IDS.MONEY_SECURITY_SMS_REMOVED]: 0,
    };
    const { queryAllByText } = renderWithProvider(<MoneySecurityView />, {
      state: stateWithProgress(progress),
    });

    expect(queryAllByText('Add')).toHaveLength(0);
  });

  it('reflects the saved transaction verification state', () => {
    const progress = {
      [STEPPER_IDS.MONEY_TRANSACTION_VERIFICATION]: 1,
    };
    const { getByTestId } = renderWithProvider(<MoneySecurityView />, {
      state: stateWithProgress(progress),
    });

    expect(
      getByTestId(MoneySecurityViewTestIds.TRANSACTION_VERIFICATION_SWITCH),
    ).toHaveProp('value', true);
  });

  it('requires verification before enabling with passkey and email', () => {
    const progress = {
      [STEPPER_IDS.MONEY_PASSKEY_COUNT]: 1,
      [STEPPER_IDS.MONEY_EMAIL_VERIFIED]: 1,
      [STEPPER_IDS.MONEY_TRANSACTION_VERIFICATION]: 0,
    };
    const { getByTestId } = renderWithProvider(<MoneySecurityView />, {
      state: stateWithProgress(progress),
    });

    fireEvent(
      getByTestId(MoneySecurityViewTestIds.TRANSACTION_VERIFICATION_SWITCH),
      'valueChange',
      true,
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.SECURITY_VERIFICATION_SHEET,
      params: {
        action: {
          type: 'enable-transaction-verification',
          returnToPrevious: true,
        },
      },
    });
  });

  it('opens the passkey prompt before enabling with no methods', () => {
    const { getByTestId } = renderWithProvider(<MoneySecurityView />, {
      state: stateWithProgress({
        [STEPPER_IDS.MONEY_TRANSACTION_VERIFICATION]: 0,
      }),
    });

    fireEvent(
      getByTestId(MoneySecurityViewTestIds.TRANSACTION_VERIFICATION_SWITCH),
      'valueChange',
      true,
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.ADD_PASSKEY_SHEET,
      params: { returnToMoneyHome: false },
    });
  });

  it('keeps the current Settings page when disabling', () => {
    const { getByTestId } = renderWithProvider(<MoneySecurityView />, {
      state: stateWithProgress({
        [STEPPER_IDS.MONEY_TRANSACTION_VERIFICATION]: 1,
      }),
    });

    fireEvent(
      getByTestId(MoneySecurityViewTestIds.TRANSACTION_VERIFICATION_SWITCH),
      'valueChange',
      false,
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.SECURITY_INFO_SHEET,
      params: {
        variant: 'disable-transaction-verification',
        returnToPrevious: true,
      },
    });
  });

  it('opens email verification from the Email row', () => {
    const { getByTestId } = renderWithProvider(<MoneySecurityView />);

    fireEvent.press(getByTestId('money-security-email-row'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.EMAIL_VERIFICATION, {
      returnToSecurity: true,
    });
  });

  it('opens email details when email is already verified', () => {
    const { getByTestId } = renderWithProvider(<MoneySecurityView />, {
      state: stateWithProgress({
        [STEPPER_IDS.MONEY_EMAIL_VERIFIED]: 1,
      }),
    });

    fireEvent.press(getByTestId('money-security-email-row'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.EMAIL_DETAILS);
  });

  it('shows a success toast after returning to this screen', () => {
    mockRouteParams = { successToast: 'Authenticator app removed' };

    renderWithProvider(<MoneySecurityView />);

    expect(mockShowSuccessToast).toHaveBeenCalledWith(
      'Authenticator app removed',
    );
    expect(mockSetParams).toHaveBeenCalledWith({ successToast: undefined });
  });
});
