import React from 'react';
import { fireEvent, screen, waitFor, act } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import CardAuthentication from './CardAuthentication';
import Routes from '../../../../../constants/navigation/Routes';
import { CardAuthenticationSelectors } from './CardAuthentication.testIds';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { useCardAuth } from '../../hooks/useCardAuth';
import { useCardSignIn } from '../../hooks/useCardSignIn';
import {
  CardProviderError,
  CardProviderErrorCode,
  CardProviderIds,
  type CardSignInResolution,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';

jest.mock('../../../../../util/analytics/whenEngineReady', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

const mockSetUserLocation = jest.fn();
const mockSetSelectedCountry = jest.fn();
const mockGetSignInOptions = jest.fn().mockReturnValue([
  { providerId: CardProviderIds.Baanx, method: 'email_password' },
  { providerId: CardProviderIds.Immersve, method: 'siwe' },
]);
const mockGetSignInLink = jest.fn().mockReturnValue(null);
const mockLogout = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      CardController: {
        setUserLocation: (...args: unknown[]) => mockSetUserLocation(...args),
        setSelectedCountry: (...args: unknown[]) =>
          mockSetSelectedCountry(...args),
        getSignInOptions: (...args: unknown[]) => mockGetSignInOptions(...args),
        getSignInLink: (...args: unknown[]) => mockGetSignInLink(...args),
        logout: (...args: unknown[]) => mockLogout(...args),
      },
    },
  },
}));

jest.mock('../../../../../core/NavigationService', () => ({
  __esModule: true,
  default: {
    get navigation() {
      return { navigate: jest.fn(), goBack: jest.fn() };
    },
  },
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    reset: jest.fn(),
    dispatch: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  }),
  useRoute: () => ({ params: {} }),
}));

jest.mock('../../hooks/useCardAuth');
jest.mock('../../hooks/useCardSignIn');

const GB_REGION = {
  key: 'GB',
  name: 'United Kingdom',
  code: 'GB',
  currency: 'GBP',
  flag: '🇬🇧',
};

jest.mock('../../hooks/useRegions', () => ({
  __esModule: true,
  default: () => ({
    allRegions: [GB_REGION, { key: 'US', name: 'United States', code: 'US' }],
    getRegionByCode: (code: string) =>
      code === 'GB'
        ? GB_REGION
        : { key: 'US', name: 'United States', code: 'US' },
    isLoading: false,
  }),
}));

jest.mock('../../hooks/useCardUkMigrationState', () => ({
  useCardUkMigrationState: () => ({
    state: {
      phase: 'soft',
      isActive: true,
      deadline: new Date('2026-09-30T23:59:59.999Z'),
    },
    refresh: jest.fn(),
  }),
}));

jest.mock('../../../../../selectors/featureFlagController/card', () => ({
  ...jest.requireActual('../../../../../selectors/featureFlagController/card'),
  selectCardForgotPasswordFeatureEnabled: () => true,
}));

let mockGeoLocation = 'GB';
let mockOnRegionChange:
  | ((region: { key: string; name: string; code: string }) => void)
  | null = null;

jest.mock('../../../../../selectors/geolocationController', () => ({
  selectGeolocationLocation: () => mockGeoLocation,
}));

jest.mock('../../components/Onboarding/RegionSelectorModal', () => {
  const actual = jest.requireActual(
    '../../components/Onboarding/RegionSelectorModal',
  );
  return {
    ...actual,
    setOnValueChange: (
      callback: (region: { key: string; name: string; code: string }) => void,
    ) => {
      mockOnRegionChange = callback;
      actual.setOnValueChange(callback);
    },
  };
});

jest.mock('../../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: () => () => ({
    address: '0x1234567890123456789012345678901234567890',
  }),
}));

jest.mock('../../../../hooks/multichainAccounts/useAccountGroupName', () => ({
  useAccountGroupName: () => 'Account 1',
}));

jest.mock('../../../../Views/AccountSelector', () => ({
  createAccountSelectorNavDetails: jest.fn(() => [
    'AccountSelectorRoute',
    { screen: 'AccountSelector' },
  ]),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  navigateWithDetails: jest.fn(),
  createNavigationDetails: jest.fn((a: string, b: string) => () => [
    { name: a },
    { screen: b },
  ]),
}));

const mockUseCardAuth = useCardAuth as jest.MockedFunction<typeof useCardAuth>;
const mockUseCardSignIn = useCardSignIn as jest.MockedFunction<
  typeof useCardSignIn
>;

const mockInitiateMutateAsync = jest.fn();
const mockSubmitMutateAsync = jest.fn();
const mockStepActionMutate = jest.fn();
const mockResetToLogin = jest.fn();
const mockRetry = jest.fn();
const mockVerifyAccount = jest.fn();
const mockSignInWithWallet = jest.fn();
const mockSelectOption = jest.fn();

const walletOption = {
  providerId: CardProviderIds.Immersve,
  method: 'siwe' as const,
};
const emailOption = {
  providerId: CardProviderIds.Baanx,
  method: 'email_password' as const,
};
const ADDR = '0x1234567890123456789012345678901234567890';

function makeAuthReturn() {
  return {
    currentStep: { type: 'email_password' as const },
    initiate: {
      mutateAsync: mockInitiateMutateAsync,
      isPending: false,
      error: null,
      reset: jest.fn(),
    },
    submit: {
      mutateAsync: mockSubmitMutateAsync,
      isPending: false,
      error: null,
      reset: jest.fn(),
    },
    stepAction: {
      mutate: mockStepActionMutate,
      isPending: false,
      error: null,
      reset: jest.fn(),
    },
    resetToLogin: mockResetToLogin,
    getErrorMessage: (err: unknown) =>
      (err as Error)?.message ?? 'Unknown error',
  } as unknown as ReturnType<typeof useCardAuth>;
}

function setResolution(
  resolution: CardSignInResolution | null,
  isResolving = false,
) {
  mockUseCardSignIn.mockReturnValue({
    resolution,
    isResolving,
    retry: mockRetry,
    verifyAccount: mockVerifyAccount,
    signInWithWallet: mockSignInWithWallet,
    selectOption: mockSelectOption,
  });
}

function render() {
  return renderScreen(
    CardAuthentication,
    { name: Routes.CARD.AUTHENTICATION },
    {
      state: {
        engine: {
          backgroundState: {
            ...backgroundState,
            CardController: {
              ...backgroundState.CardController,
              providerData: { baanx: { location: 'international' } },
            },
          },
        },
      },
    },
  );
}

jest.useFakeTimers({ advanceTimers: true });

describe('CardAuthentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGeoLocation = 'GB';
    mockOnRegionChange = null;
    mockUseCardAuth.mockReturnValue(makeAuthReturn());
    mockInitiateMutateAsync.mockResolvedValue(undefined);
    mockSubmitMutateAsync.mockResolvedValue({ done: true });
    mockVerifyAccount.mockResolvedValue('found');
    mockSignInWithWallet.mockResolvedValue(undefined);
    mockGetSignInLink.mockReturnValue(null);
    mockLogout.mockResolvedValue(undefined);
    setResolution({ kind: 'email', option: emailOption });
  });

  describe('R0 Resolving', () => {
    it('shows skeleton rows while resolving', () => {
      setResolution(null, true);
      render();

      expect(
        screen.getByTestId(CardAuthenticationSelectors.RESOLVING_SKELETON),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON),
      ).toBeNull();
    });
  });

  describe('R1 Wallet', () => {
    it('shows the linked account and SIWE CTA', () => {
      setResolution({
        kind: 'wallet',
        option: walletOption,
        address: ADDR,
        source: 'record',
      });
      render();

      expect(
        screen.getByTestId(CardAuthenticationSelectors.ACCOUNT_SELECT),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON),
      ).toBeOnTheScreen();
    });

    it('verifies the wallet account once when Sign in is pressed twice', async () => {
      mockVerifyAccount.mockImplementation(() => new Promise(() => undefined));
      setResolution({
        kind: 'unresolved',
        options: [walletOption, emailOption],
        reason: 'no_match',
      });
      render();

      fireEvent.press(
        screen.getByTestId(CardAuthenticationSelectors.FORK_WALLET),
      );

      const signInButton = screen.getByTestId(
        CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON,
      );

      await act(async () => {
        fireEvent.press(signInButton);
        fireEvent.press(signInButton);
      });

      expect(mockVerifyAccount).toHaveBeenCalledTimes(1);
    });

    it('shows the no_card banner when a manual wallet verify returns not_found', async () => {
      mockVerifyAccount.mockResolvedValue('not_found');
      setResolution({
        kind: 'unresolved',
        options: [walletOption, emailOption],
        reason: 'no_match',
      });
      render();

      fireEvent.press(
        screen.getByTestId(CardAuthenticationSelectors.FORK_WALLET),
      );

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON),
        );
      });

      await waitFor(() => {
        expect(
          screen.getByTestId(CardAuthenticationSelectors.BANNER),
        ).toBeOnTheScreen();
      });
      expect(screen.getByText(/couldn.t find your card/i)).toBeOnTheScreen();
      expect(mockSignInWithWallet).not.toHaveBeenCalled();
    });
  });

  describe('R2 Account missing', () => {
    it('shows the missing-account banner with choose/import actions', () => {
      setResolution({
        kind: 'wallet_account_missing',
        option: walletOption,
        address: ADDR,
      });
      render();

      expect(
        screen.getByTestId(CardAuthenticationSelectors.BANNER),
      ).toBeOnTheScreen();
      expect(screen.getByText(/isn.t on this device/i)).toBeOnTheScreen();
    });
  });

  describe('R3 Resume', () => {
    it('shows finish-updating progress and continue CTA', () => {
      setResolution({
        kind: 'resume',
        option: walletOption,
        address: ADDR,
        stage: 'identity',
      });
      render();

      expect(
        screen.getByTestId(CardAuthenticationSelectors.RESUME_PROGRESS),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(CardAuthenticationSelectors.RESUME_SOFT_LINK),
      ).toBeOnTheScreen();
    });

    it('reveals the email form from the soft link', () => {
      setResolution({
        kind: 'resume',
        option: walletOption,
        address: ADDR,
        stage: 'spending',
      });
      render();

      fireEvent.press(
        screen.getByTestId(CardAuthenticationSelectors.RESUME_SOFT_LINK),
      );

      expect(
        screen.getByTestId(CardAuthenticationSelectors.EMAIL_FIELD),
      ).toBeOnTheScreen();
    });
  });

  describe('R4 Email', () => {
    it('renders email and password fields for a single email option', () => {
      setResolution({ kind: 'email', option: emailOption });
      render();

      expect(
        screen.getByTestId(CardAuthenticationSelectors.EMAIL_FIELD),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(CardAuthenticationSelectors.PASSWORD_FIELD),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(CardAuthenticationSelectors.FORK_CONTAINER),
      ).toBeNull();
    });

    it('shows bad_creds banner for InvalidCredentials', async () => {
      mockSubmitMutateAsync.mockRejectedValue(
        new CardProviderError(
          CardProviderErrorCode.InvalidCredentials,
          'Invalid login details',
        ),
      );
      setResolution({ kind: 'email', option: emailOption });
      render();

      fireEvent.changeText(
        screen.getByTestId(CardAuthenticationSelectors.EMAIL_FIELD),
        'a@b.com',
      );
      fireEvent.changeText(
        screen.getByTestId(CardAuthenticationSelectors.PASSWORD_FIELD),
        'password123',
      );

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON),
        );
      });

      await waitFor(() => {
        expect(
          screen.getByTestId(CardAuthenticationSelectors.BANNER),
        ).toBeOnTheScreen();
      });
      expect(screen.getByText(/couldn.t sign you in/i)).toBeOnTheScreen();
    });

    it('does not show bad_creds banner for Network failures', async () => {
      const networkError = new CardProviderError(
        CardProviderErrorCode.Network,
        'Network error. Please check your connection and try again.',
      );
      mockSubmitMutateAsync.mockRejectedValue(networkError);
      setResolution({ kind: 'email', option: emailOption });
      render();

      fireEvent.changeText(
        screen.getByTestId(CardAuthenticationSelectors.EMAIL_FIELD),
        'a@b.com',
      );
      fireEvent.changeText(
        screen.getByTestId(CardAuthenticationSelectors.PASSWORD_FIELD),
        'password123',
      );

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON),
        );
      });

      await waitFor(() => {
        expect(mockSubmitMutateAsync).toHaveBeenCalled();
      });
      expect(
        screen.queryByTestId(CardAuthenticationSelectors.BANNER),
      ).toBeNull();
    });

    it('shows inline network error text without a banner', () => {
      const networkError = new CardProviderError(
        CardProviderErrorCode.Network,
        'Network error. Please check your connection and try again.',
      );
      mockUseCardAuth.mockReturnValue({
        ...makeAuthReturn(),
        submit: {
          mutateAsync: mockSubmitMutateAsync,
          isPending: false,
          error: networkError,
          reset: jest.fn(),
        },
        getErrorMessage: () => networkError.message,
      } as unknown as ReturnType<typeof useCardAuth>);
      setResolution({ kind: 'email', option: emailOption });
      render();

      expect(
        screen.getByTestId(CardAuthenticationSelectors.LOGIN_ERROR_TEXT),
      ).toBeOnTheScreen();
      expect(screen.getByText(/network error/i)).toBeOnTheScreen();
      expect(
        screen.queryByTestId(CardAuthenticationSelectors.BANNER),
      ).toBeNull();
    });

    it('submits the verification code when the step is OTP', async () => {
      mockUseCardAuth.mockReturnValue({
        ...makeAuthReturn(),
        currentStep: { type: 'otp' as const, destination: '+1555****90' },
      } as unknown as ReturnType<typeof useCardAuth>);
      setResolution({ kind: 'email', option: emailOption });
      render();

      fireEvent.changeText(
        screen.getByTestId(CardAuthenticationSelectors.OTP_CODE_FIELD),
        '123456',
      );

      await waitFor(() => {
        expect(mockSubmitMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'email_password',
            otpCode: '123456',
          }),
        );
      });
    });

    it('does not show the password banner after an invalid code', async () => {
      const auth = makeAuthReturn();
      let step: { type: 'otp' | 'email_password'; destination?: string } = {
        type: 'otp',
        destination: '+1555****90',
      };
      mockUseCardAuth.mockImplementation(
        () =>
          ({
            ...auth,
            currentStep: step,
          }) as ReturnType<typeof useCardAuth>,
      );
      mockSubmitMutateAsync.mockRejectedValue(
        new CardProviderError(
          CardProviderErrorCode.InvalidOtp,
          'Incorrect code',
        ),
      );
      setResolution({ kind: 'email', option: emailOption });
      render();

      fireEvent.changeText(
        screen.getByTestId(CardAuthenticationSelectors.OTP_CODE_FIELD),
        '123456',
      );

      await waitFor(() => {
        expect(mockSubmitMutateAsync).toHaveBeenCalled();
      });

      step = { type: 'email_password' };
      fireEvent.press(
        screen.getByTestId(
          CardAuthenticationSelectors.OTP_BACK_TO_LOGIN_BUTTON,
        ),
      );

      expect(
        screen.queryByTestId(CardAuthenticationSelectors.BANNER),
      ).toBeNull();
      expect(
        screen.getByTestId(CardAuthenticationSelectors.EMAIL_FIELD),
      ).toBeOnTheScreen();
    });
  });

  describe('R5 Unresolved', () => {
    it('shows the email/wallet fork', () => {
      setResolution({
        kind: 'unresolved',
        options: [walletOption, emailOption],
        reason: 'no_match',
      });
      render();

      expect(
        screen.getByTestId(CardAuthenticationSelectors.FORK_CONTAINER),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(CardAuthenticationSelectors.FORK_EMAIL),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(CardAuthenticationSelectors.FORK_WALLET),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(CardAuthenticationSelectors.FORK_NOT_SURE),
      ).toBeOnTheScreen();
    });

    it('shows Try again when reason is check_failed', () => {
      setResolution({
        kind: 'unresolved',
        options: [walletOption, emailOption],
        reason: 'check_failed',
      });
      render();

      fireEvent.press(
        screen.getByTestId(CardAuthenticationSelectors.FORK_TRY_AGAIN),
      );
      expect(mockRetry).toHaveBeenCalled();
    });

    it('opens the email form from the fork', () => {
      setResolution({
        kind: 'unresolved',
        options: [walletOption, emailOption],
        reason: 'no_match',
      });
      render();

      fireEvent.press(
        screen.getByTestId(CardAuthenticationSelectors.FORK_EMAIL),
      );

      expect(
        screen.getByTestId(CardAuthenticationSelectors.EMAIL_FIELD),
      ).toBeOnTheScreen();
    });

    it('shows the no_card banner and signup link when verify returns not_found', async () => {
      mockVerifyAccount.mockResolvedValue('not_found');
      setResolution({
        kind: 'unresolved',
        options: [walletOption, emailOption],
        reason: 'no_match',
      });
      render();

      fireEvent.press(
        screen.getByTestId(CardAuthenticationSelectors.FORK_WALLET),
      );

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON),
        );
      });

      await waitFor(() => {
        expect(
          screen.getByTestId(CardAuthenticationSelectors.BANNER),
        ).toBeOnTheScreen();
      });
      expect(screen.getByText(/couldn.t find your card/i)).toBeOnTheScreen();
      expect(
        screen.getByTestId(CardAuthenticationSelectors.SIGNUP_BUTTON),
      ).toBeOnTheScreen();
      expect(mockSignInWithWallet).not.toHaveBeenCalled();
    });

    it('clears the no_card banner when switching to email sign-in', async () => {
      mockVerifyAccount.mockResolvedValue('not_found');
      setResolution({
        kind: 'unresolved',
        options: [walletOption, emailOption],
        reason: 'no_match',
      });
      render();

      fireEvent.press(
        screen.getByTestId(CardAuthenticationSelectors.FORK_WALLET),
      );

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON),
        );
      });

      await waitFor(() => {
        expect(
          screen.getByTestId(CardAuthenticationSelectors.BANNER),
        ).toBeOnTheScreen();
      });

      fireEvent.press(screen.getByText(/signing in with your wallet/i));
      fireEvent.press(
        screen.getByTestId(CardAuthenticationSelectors.FORK_EMAIL),
      );

      expect(
        screen.queryByTestId(CardAuthenticationSelectors.BANNER),
      ).toBeNull();
      expect(
        screen.getByTestId(CardAuthenticationSelectors.EMAIL_FIELD),
      ).toBeOnTheScreen();
    });

    it('shows account_check_failed when verify returns unknown', async () => {
      mockVerifyAccount.mockResolvedValue('unknown');
      setResolution({
        kind: 'unresolved',
        options: [walletOption, emailOption],
        reason: 'no_match',
      });
      render();

      fireEvent.press(
        screen.getByTestId(CardAuthenticationSelectors.FORK_WALLET),
      );

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON),
        );
      });

      await waitFor(() => {
        expect(
          screen.getByTestId(CardAuthenticationSelectors.UK_LOGIN_ERROR_TEXT),
        ).toBeOnTheScreen();
      });
      expect(
        screen.getByText(/couldn.t check this account/i),
      ).toBeOnTheScreen();
      expect(mockSignInWithWallet).not.toHaveBeenCalled();
    });

    it('shows the no_card banner when authenticateWithWallet rejects with NotFound', async () => {
      mockVerifyAccount.mockResolvedValue('found');
      mockSignInWithWallet.mockRejectedValue(
        new CardProviderError(
          CardProviderErrorCode.NotFound,
          'Account does not exist',
          403,
          'ACCOUNT_DOES_NOT_EXIST',
        ),
      );
      setResolution({
        kind: 'unresolved',
        options: [walletOption, emailOption],
        reason: 'no_match',
      });
      render();

      fireEvent.press(
        screen.getByTestId(CardAuthenticationSelectors.FORK_WALLET),
      );

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON),
        );
      });

      await waitFor(() => {
        expect(
          screen.getByTestId(CardAuthenticationSelectors.BANNER),
        ).toBeOnTheScreen();
      });
      expect(screen.getByText(/couldn.t find your card/i)).toBeOnTheScreen();
      expect(
        screen.queryByTestId(CardAuthenticationSelectors.UK_LOGIN_ERROR_TEXT),
      ).toBeNull();
    });
  });

  describe('R6 Wrong door', () => {
    it('shows the moved banner with wallet CTA and logs out the Baanx session', async () => {
      mockGetSignInLink.mockReturnValue({
        status: 'completed',
        address: ADDR,
      });
      mockSubmitMutateAsync.mockResolvedValue({ done: true });
      setResolution({
        kind: 'resume',
        option: walletOption,
        address: ADDR,
        stage: 'identity',
      });
      render();

      fireEvent.press(
        screen.getByTestId(CardAuthenticationSelectors.RESUME_SOFT_LINK),
      );

      fireEvent.changeText(
        screen.getByTestId(CardAuthenticationSelectors.EMAIL_FIELD),
        'a@b.com',
      );
      fireEvent.changeText(
        screen.getByTestId(CardAuthenticationSelectors.PASSWORD_FIELD),
        'password123',
      );

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON),
        );
      });

      await waitFor(() => {
        expect(
          screen.getByTestId(CardAuthenticationSelectors.BANNER),
        ).toBeOnTheScreen();
      });
      expect(screen.getByText(/card has moved/i)).toBeOnTheScreen();
      expect(screen.getByText(/continue with your wallet/i)).toBeOnTheScreen();
      expect(mockLogout).toHaveBeenCalled();

      fireEvent.press(screen.getByText(/continue with your wallet/i));

      expect(
        screen.getByTestId(CardAuthenticationSelectors.ACCOUNT_SELECT),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON),
      ).toBeOnTheScreen();
    });
  });

  describe('country field', () => {
    it('renders the country select', () => {
      setResolution({ kind: 'email', option: emailOption });
      render();

      expect(
        screen.getByTestId(CardAuthenticationSelectors.COUNTRY_SELECT),
      ).toBeOnTheScreen();
    });

    it('keeps a manually chosen country when geolocation arrives later', () => {
      mockGeoLocation = 'UNKNOWN';
      setResolution({ kind: 'email', option: emailOption });
      const { store } = render();

      fireEvent.press(
        screen.getByTestId(CardAuthenticationSelectors.COUNTRY_SELECT),
      );
      act(() => {
        mockOnRegionChange?.({ key: 'US', name: 'United States', code: 'US' });
      });

      expect(screen.getByText(/United States/)).toBeOnTheScreen();

      mockGeoLocation = 'GB';
      act(() => {
        store.dispatch({ type: 'test/geolocation-updated' });
      });

      expect(screen.getByText(/United States/)).toBeOnTheScreen();
      expect(screen.queryByText(/United Kingdom/)).toBeNull();
    });
  });
});
