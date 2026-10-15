import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import Routes from '../../../../constants/navigation/Routes';
import { STEPPER_IDS } from '../../../UI/Money/hooks/useOnboardingStep';
import PrototypeSecuritySettings from './PrototypeSecuritySettings';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('../../../../core/Authentication/hooks/useAuthCapabilities', () => ({
  __esModule: true,
  default: () => ({
    isLoading: false,
    capabilities: {
      authLabel: 'Face ID',
      authDescription: 'Use Face ID',
      authType: 'deviceAuth',
      osAuthEnabled: true,
      allowLoginWithRememberMe: false,
      deviceAuthRequiresSettings: false,
    },
  }),
}));

const initialState = {
  user: { seedphraseBackedUp: false },
  settings: { lockTime: 30000 },
  engine: { backgroundState },
};

describe('PrototypeSecuritySettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the security and password layout', () => {
    const { getByText } = renderWithProvider(<PrototypeSecuritySettings />, {
      state: initialState,
    });

    expect(getByText('Security and password')).toBeOnTheScreen();
    expect(getByText('Manage wallet recovery')).toBeOnTheScreen();
    expect(getByText('⚠ Back up incomplete')).toBeOnTheScreen();
    expect(getByText('Device authentication')).toBeOnTheScreen();
    expect(getByText('Password')).toBeOnTheScreen();
    expect(getByText('2-step verification')).toBeOnTheScreen();
    expect(getByText('After 30 seconds')).toBeOnTheScreen();
  });

  it('opens 2-step verification', () => {
    const { getByTestId } = renderWithProvider(<PrototypeSecuritySettings />, {
      state: initialState,
    });

    fireEvent.press(getByTestId('two-step-verification'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MANAGE_SECURITY);
  });

  it('opens verification instead of password entry when methods exist', () => {
    const { getByTestId } = renderWithProvider(<PrototypeSecuritySettings />, {
      state: {
        ...initialState,
        user: {
          ...initialState.user,
          onboardingStepperProgress: {
            [STEPPER_IDS.MONEY_PASSKEY_COUNT]: 1,
            [STEPPER_IDS.MONEY_EMAIL_VERIFIED]: 1,
            [STEPPER_IDS.MONEY_TRANSACTION_VERIFICATION]: 0,
          },
        },
      },
    });

    fireEvent(getByTestId('device-security-toggle'), 'valueChange', true);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.SECURITY_VERIFICATION_SHEET,
      params: {
        action: {
          type: 'enable-transaction-verification',
          returnToPrevious: true,
        },
      },
    });
    expect(mockNavigate).not.toHaveBeenCalledWith(
      'EnterPasswordSimple',
      expect.anything(),
    );
  });

  it('opens the passkey prompt when no methods exist', () => {
    const { getByTestId } = renderWithProvider(<PrototypeSecuritySettings />, {
      state: initialState,
    });

    fireEvent(getByTestId('device-security-toggle'), 'valueChange', true);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.ADD_PASSKEY_SHEET,
      params: { returnToMoneyHome: false },
    });
  });
});
