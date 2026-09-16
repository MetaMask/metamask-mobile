import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider, {
  type DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import Routes from '../../../../../constants/navigation/Routes';
import { AccountType } from '../../../../../constants/onboarding';
import { AuthConnection } from '../../../../../core/OAuthService/OAuthInterface';
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

describe('MoneySecurityView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = undefined;
  });

  it('uses the 2-step verification title and Security methods heading', () => {
    const { getByText, queryByText } = renderWithProvider(
      <MoneySecurityView />,
    );

    expect(getByText('2-step verification')).toBeOnTheScreen();
    expect(getByText('Security methods')).toBeOnTheScreen();
    expect(queryByText('Your methods')).not.toBeOnTheScreen();
  });

  it('shows a removal toast after returning to this screen', () => {
    mockRouteParams = { successToast: 'Authenticator app removed' };

    renderWithProvider(<MoneySecurityView />);

    expect(mockShowSuccessToast).toHaveBeenCalledWith(
      'Authenticator app removed',
    );
    expect(mockSetParams).toHaveBeenCalledWith({ successToast: undefined });
  });

  it('shows SMS without exposing the identity for social-login users', () => {
    const state = {
      engine: {
        backgroundState: {
          SeedlessOnboardingController: {
            authConnection: 'google',
            socialLoginEmail: 'account@gmail.com',
          },
        },
      },
    } as unknown as DeepPartial<RootState>;

    const { getByTestId, getByText, queryByText } = renderWithProvider(
      <MoneySecurityView />,
      { state },
    );

    expect(getByText('SMS')).toBeOnTheScreen();
    expect(queryByText('Social login')).not.toBeOnTheScreen();
    expect(queryByText('Gmail')).not.toBeOnTheScreen();
    expect(queryByText('account@gmail.com')).not.toBeOnTheScreen();
    expect(queryByText('Social')).not.toBeOnTheScreen();
    expect(queryByText('Added')).not.toBeOnTheScreen();
    expect(
      getByTestId(`${MoneySecurityViewTestIds.SMS_ROW}-added-check`),
    ).toBeOnTheScreen();
    expect(getByTestId(MoneySecurityViewTestIds.SMS_ROW)).toHaveProp(
      'accessibilityState',
      { selected: true },
    );
    fireEvent.press(getByTestId(MoneySecurityViewTestIds.SMS_ROW));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.SMS_DETAILS);
  });

  it('offers social recovery for SRP users', () => {
    const { getAllByText, getByText } = renderWithProvider(
      <MoneySecurityView />,
    );

    expect(getByText('Social')).toBeOnTheScreen();
    expect(getAllByText('Add')).toHaveLength(3);
  });

  it('shows a chevron next to Add when SMS was removed', () => {
    const state = {
      onboarding: {
        seedlessOnboarding: {
          clientId: 'client-id',
          authConnection: AuthConnection.Google,
        },
      },
      user: {
        onboardingStepperProgress: {
          'money-security-sms-removed': 1,
        },
      },
    } as unknown as DeepPartial<RootState>;

    const { getAllByText, getByTestId } = renderWithProvider(
      <MoneySecurityView />,
      { state },
    );

    expect(getAllByText('Add').length).toBeGreaterThan(0);
    expect(
      getByTestId(`${MoneySecurityViewTestIds.SMS_ROW}-chevron`),
    ).toBeOnTheScreen();
    fireEvent.press(getByTestId(MoneySecurityViewTestIds.SMS_ROW));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.SMS_SETUP);
  });

  it('shows the number of registered passkeys', () => {
    const state = {
      user: {
        onboardingStepperProgress: {
          'money-finish-setup': 2,
          'money-passkey-count': 1,
        },
      },
    } as unknown as DeepPartial<RootState>;

    const { getByTestId, getByText, queryByText } = renderWithProvider(
      <MoneySecurityView />,
      { state },
    );

    expect(getByText('1 passkey')).toBeOnTheScreen();
    expect(queryByText('Recommended')).not.toBeOnTheScreen();
    expect(
      getByTestId(`${MoneySecurityViewTestIds.PASSKEYS_ROW}-added-check`),
    ).toBeOnTheScreen();
  });

  it('opens authenticator setup from the security methods list', () => {
    const { getByTestId } = renderWithProvider(<MoneySecurityView />);

    fireEvent.press(getByTestId(MoneySecurityViewTestIds.AUTHENTICATOR_ROW));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.AUTHENTICATOR, {
      entryPoint: 'security',
    });
  });

  it('opens authenticator details when the method is configured', () => {
    const state = {
      user: {
        onboardingStepperProgress: {
          'money-security-authenticator': 1,
        },
      },
    } as unknown as DeepPartial<RootState>;
    const { getByTestId } = renderWithProvider(<MoneySecurityView />, {
      state,
    });

    fireEvent.press(getByTestId(MoneySecurityViewTestIds.AUTHENTICATOR_ROW));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MONEY.AUTHENTICATOR_DETAILS,
    );
  });

  it('uses Authenticator app as the transaction verification default', () => {
    const state = {
      user: {
        onboardingStepperProgress: {
          'money-security-authenticator': 1,
          'money-security-social': 1,
          'money-transaction-verification': 1,
        },
      },
    } as unknown as DeepPartial<RootState>;

    const { getByText } = renderWithProvider(<MoneySecurityView />, { state });

    expect(
      getByText(
        'Use a 2-step verification when sending money. Default: Authenticator app',
      ),
    ).toBeOnTheScreen();
  });

  it('prioritizes passkeys when multiple verification methods exist', () => {
    const state = {
      user: {
        onboardingStepperProgress: {
          'money-passkey-count': 1,
          'money-security-authenticator': 1,
          'money-security-social': 1,
          'money-transaction-verification': 1,
        },
      },
    } as unknown as DeepPartial<RootState>;

    const { getByText } = renderWithProvider(<MoneySecurityView />, { state });

    expect(
      getByText(
        'Use a 2-step verification when sending money. Default: Passkeys',
      ),
    ).toBeOnTheScreen();
  });

  it('does not use social login for transaction verification', () => {
    const state = {
      user: {
        onboardingStepperProgress: {
          'money-security-social': 1,
          'money-transaction-verification': 1,
        },
      },
    } as unknown as DeepPartial<RootState>;

    const { getByTestId, getByText, queryByTestId } = renderWithProvider(
      <MoneySecurityView />,
      { state },
    );

    expect(
      getByText(
        'Use a 2-step verification when sending money. Default: Passkeys',
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneySecurityViewTestIds.SECONDARY_METHOD_ROW),
    ).toBeOnTheScreen();
    expect(queryByTestId(MoneySecurityViewTestIds.SMS_ROW)).toBeNull();
  });

  it('uses the stable prototype wallet-origin marker for social login', () => {
    const state = {
      user: {
        onboardingStepperProgress: {
          'money-recovery-social-login-wallet': 1,
        },
      },
    } as unknown as DeepPartial<RootState>;

    const { getByTestId, queryByText } = renderWithProvider(
      <MoneySecurityView />,
      { state },
    );

    expect(getByTestId(MoneySecurityViewTestIds.SMS_ROW)).toBeOnTheScreen();
    expect(queryByText('Social login')).not.toBeOnTheScreen();
    expect(queryByText('Social')).not.toBeOnTheScreen();
  });

  it('uses SMS as the default when a social identity exists without a vault', () => {
    const state = {
      engine: {
        backgroundState: {
          SeedlessOnboardingController: {
            authConnection: 'google',
            socialLoginEmail: 'account@gmail.com',
          },
        },
      },
      user: {
        onboardingStepperProgress: {
          'money-transaction-verification': 1,
        },
      },
    } as unknown as DeepPartial<RootState>;

    const { getByText } = renderWithProvider(<MoneySecurityView />, { state });

    expect(
      getByText('Use a 2-step verification when sending money. Default: SMS'),
    ).toBeOnTheScreen();
  });

  it('shows SMS when persisted onboarding account type is social', () => {
    const state = {
      onboarding: {
        accountType: AccountType.MetamaskGoogle,
      },
    } as unknown as DeepPartial<RootState>;

    const { getByTestId, queryByText } = renderWithProvider(
      <MoneySecurityView />,
      { state },
    );

    expect(getByTestId(MoneySecurityViewTestIds.SMS_ROW)).toBeOnTheScreen();
    expect(queryByText('Social')).not.toBeOnTheScreen();
  });

  it('keeps a newly created SRP wallet in the SRP flow despite stale social state', () => {
    const state = {
      onboarding: {
        accountType: AccountType.Metamask,
        seedlessOnboarding: {
          clientId: 'stale-client-id',
          authConnection: AuthConnection.Google,
        },
      },
      engine: {
        backgroundState: {
          SeedlessOnboardingController: {
            userId: 'stale-user-id',
            socialLoginEmail: 'stale@gmail.com',
            authConnection: AuthConnection.Google,
            vault: 'stale-vault',
          },
        },
      },
      user: {
        onboardingStepperProgress: {
          'money-recovery-social-login-wallet': 1,
        },
      },
    } as unknown as DeepPartial<RootState>;

    const { getByTestId, queryByTestId } = renderWithProvider(
      <MoneySecurityView />,
      { state },
    );

    expect(
      getByTestId(MoneySecurityViewTestIds.SECONDARY_METHOD_ROW),
    ).toBeOnTheScreen();
    expect(queryByTestId(MoneySecurityViewTestIds.SMS_ROW)).toBeNull();
  });

  it('shows SMS from the persisted seedless auth connection', () => {
    const state = {
      onboarding: {
        seedlessOnboarding: {
          clientId: 'client-id',
          authConnection: AuthConnection.Google,
        },
      },
    } as unknown as DeepPartial<RootState>;

    const { getByTestId, queryByText } = renderWithProvider(
      <MoneySecurityView />,
      { state },
    );

    expect(getByTestId(MoneySecurityViewTestIds.SMS_ROW)).toBeOnTheScreen();
    expect(queryByText('Social')).not.toBeOnTheScreen();
  });

  it('does not open Add passkey when an existing method is available', () => {
    const state = {
      user: {
        onboardingStepperProgress: {
          'money-security-authenticator': 1,
        },
      },
    } as unknown as DeepPartial<RootState>;
    const { getByTestId } = renderWithProvider(<MoneySecurityView />, {
      state,
    });

    fireEvent(
      getByTestId(MoneySecurityViewTestIds.TRANSACTION_VERIFICATION_SWITCH),
      'valueChange',
      true,
    );

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('opens a warning sheet before disabling transaction verification', () => {
    const state = {
      user: {
        onboardingStepperProgress: {
          'money-security-authenticator': 1,
          'money-transaction-verification': 1,
        },
      },
    } as unknown as DeepPartial<RootState>;
    const { getByTestId } = renderWithProvider(<MoneySecurityView />, {
      state,
    });

    fireEvent(
      getByTestId(MoneySecurityViewTestIds.TRANSACTION_VERIFICATION_SWITCH),
      'valueChange',
      false,
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.SECURITY_INFO_SHEET,
      params: { variant: 'disable-transaction-verification' },
    });
  });

  it('opens Add passkey when no method exists', () => {
    const { getByTestId, getByText, queryByText } = renderWithProvider(
      <MoneySecurityView />,
    );

    expect(queryByText('Protect your Money account')).not.toBeOnTheScreen();
    expect(
      getByText(
        'Use these to access your wallet from another device and verify Money account transactions.',
      ),
    ).toBeOnTheScreen();

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
});
