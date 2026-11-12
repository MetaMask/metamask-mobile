import { renderHook } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useContext } from 'react';
import { useImmersveOnboardingRouter } from './useImmersveOnboardingRouter';
import Routes from '../../../../constants/navigation/Routes';
import type { ImmersveNextAction } from '../util/immersvePrerequisites';

let mockSelectedCountry: string | null = null;
let mockCountryFunding: Record<string, { source: string }> = {};

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useStore: () => ({
    getState: () => ({}),
  }),
}));

jest.mock('../../../../selectors/cardController', () => ({
  selectCardSelectedCountry: () => mockSelectedCountry,
}));

jest.mock('../../../../selectors/featureFlagController/card', () => ({
  selectCardImmersveCountryFunding: () => mockCountryFunding,
  immersveFundingChannelForCountry: (
    countryFunding: Record<string, { source?: string }> | null | undefined,
    country: string | null | undefined,
  ) => {
    if (!country || !countryFunding) {
      return null;
    }
    return countryFunding[country.toUpperCase()] ?? null;
  },
  isMoneyAccountFundingChannel: (
    channel: { source?: string } | null | undefined,
  ) => channel?.source === 'moneyAccount',
}));

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
}));

jest.mock('../../../../util/theme', () => ({
  useTheme: () => ({ colors: { success: { default: 'mock-success' } } }),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockAddProperties = jest.fn(() => ({ build: jest.fn() }));
jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: mockAddProperties,
    })),
  }),
}));

const mockSetSignInLinkStage = jest.fn();
const mockMarkMigrationCompleted = jest.fn();
const mockRecordCardActivated = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    CardController: {
      setSignInLinkStage: (...args: unknown[]) =>
        mockSetSignInLinkStage(...args),
      markMigrationCompleted: (...args: unknown[]) =>
        mockMarkMigrationCompleted(...args),
      recordCardActivated: (...args: unknown[]) =>
        mockRecordCardActivated(...args),
    },
  },
}));

const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockShowToast = jest.fn();

const getRoute = () => {
  const { result } = renderHook(() => useImmersveOnboardingRouter());
  return result.current;
};

describe('useImmersveOnboardingRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedCountry = null;
    mockCountryFunding = {};
    mockRecordCardActivated.mockResolvedValue(undefined);
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      reset: mockReset,
    });
    (useContext as jest.Mock).mockReturnValue({
      toastRef: { current: { showToast: mockShowToast } },
    });
    mockMarkMigrationCompleted.mockResolvedValue(undefined);
  });

  it('routes contact to SIGN_UP', () => {
    const action: ImmersveNextAction = {
      type: 'contact',
      needsEmail: true,
      needsPhone: true,
    };
    getRoute()(action, { email: 'a@b.co', countryKey: 'GB' });

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.CARD.ONBOARDING.SIGN_UP,
      {},
    );
  });

  it.each(['kyc', 'pending', 'expected_spend'] as const)(
    'routes %s to KYC_PROCESSING',
    (type) => {
      getRoute()({ type } as ImmersveNextAction, { countryKey: 'GB' });

      expect(mockSetSignInLinkStage).toHaveBeenCalledWith('identity');
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.ONBOARDING.KYC_PROCESSING,
        { countryKey: 'GB', kycUrl: undefined },
      );
    },
  );

  it('forwards the kyc url to KYC_PROCESSING so it can skip the first poll', () => {
    getRoute()(
      { type: 'kyc', url: 'https://verify.immersve.com/abc' },
      { countryKey: 'GB' },
    );

    expect(mockSetSignInLinkStage).toHaveBeenCalledWith('identity');
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.CARD.ONBOARDING.KYC_PROCESSING,
      { countryKey: 'GB', kycUrl: 'https://verify.immersve.com/abc' },
    );
  });

  it('routes funding to FUNDING_APPROVAL with countryKey', () => {
    getRoute()(
      {
        type: 'funding',
        write: {
          abi: [],
          contractAddress: '0x',
          method: 'approve',
          params: {},
        },
      },
      { countryKey: 'GB', fundingAddress: '0xFunding' },
    );

    expect(mockSetSignInLinkStage).toHaveBeenCalledWith('spending');
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.CARD.ONBOARDING.FUNDING_APPROVAL,
      { countryKey: 'GB', fundingAddress: '0xFunding' },
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: Routes.CARD.ONBOARDING.FUNDING_APPROVAL,
      }),
    );
  });

  it('routes Money account funding to Card Home', () => {
    mockCountryFunding = { NZ: { source: 'moneyAccount' } };

    getRoute()(
      {
        type: 'funding',
        write: {
          abi: [],
          contractAddress: '0x',
          method: 'approve',
          params: {},
        },
      },
      { countryKey: 'NZ' },
    );

    expect(mockSetSignInLinkStage).toHaveBeenCalledWith('spending');
    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: Routes.CARD.HOME }],
    });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({ destination: Routes.CARD.HOME }),
    );
  });

  it('uses the selected country when funding has no countryKey', () => {
    mockSelectedCountry = 'NZ';
    mockCountryFunding = { NZ: { source: 'moneyAccount' } };

    getRoute()({
      type: 'funding',
      write: {
        abi: [],
        contractAddress: '0x',
        method: 'approve',
        params: {},
      },
    });

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: Routes.CARD.HOME }],
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('resets to Card Home for funding when the user already has a card', () => {
    getRoute()(
      {
        type: 'funding',
        write: {
          abi: [],
          contractAddress: '0x',
          method: 'approve',
          params: {},
        },
      },
      { countryKey: 'GB', hasExistingCard: true, fundingAddress: '0xFunding' },
    );

    expect(mockSetSignInLinkStage).toHaveBeenCalledWith('spending');
    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: Routes.CARD.HOME }],
    });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('resets to KYC_FAILED when rejected', () => {
    getRoute()({ type: 'rejected', canRetry: false });

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: Routes.CARD.ONBOARDING.KYC_FAILED }],
    });
  });

  it('opens KYC processing with the retry link when the rejection can be retried', () => {
    getRoute()(
      {
        type: 'rejected',
        canRetry: true,
        retryUrl: 'https://verify.immersve.com/retry',
        reasons: ['ID_DOCUMENT_EXPIRED'],
      },
      { countryKey: 'GB' },
    );

    expect(mockSetSignInLinkStage).toHaveBeenCalledWith('identity');
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.CARD.ONBOARDING.KYC_PROCESSING,
      {
        countryKey: 'GB',
        kycUrl: 'https://verify.immersve.com/retry',
      },
    );
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('shows a toast and resets to Card Home when active', () => {
    getRoute()({ type: 'active' });

    expect(mockMarkMigrationCompleted).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [
          { label: 'card.card_onboarding.sign_up.account_exists_toast' },
        ],
      }),
    );
    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: Routes.CARD.HOME }],
    });
  });

  it('records the card as activated for the funding account when active', () => {
    getRoute()({ type: 'active' }, { fundingAddress: '0xabc' });

    expect(mockRecordCardActivated).toHaveBeenCalledTimes(1);
    expect(mockRecordCardActivated).toHaveBeenCalledWith({
      provider: 'immersve',
      address: '0xabc',
    });
  });

  it('does not record a card activation for a non-active action', () => {
    getRoute()({ type: 'pending' });

    expect(mockRecordCardActivated).not.toHaveBeenCalled();
  });

  it('suppresses the toast when active but showAccountExistsToast is false', () => {
    getRoute()({ type: 'active' }, { showAccountExistsToast: false });

    expect(mockMarkMigrationCompleted).toHaveBeenCalledTimes(1);
    expect(mockShowToast).not.toHaveBeenCalled();
    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: Routes.CARD.HOME }],
    });
  });

  describe('navigateFromRoot (caller outside OnboardingNavigator)', () => {
    it('routes contact to the first onboarding page (SignUp)', () => {
      getRoute()(
        { type: 'contact', needsEmail: true, needsPhone: true },
        { email: 'a@b.co', countryKey: 'GB', navigateFromRoot: true },
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ONBOARDING.ROOT, {
        screen: Routes.CARD.ONBOARDING.SIGN_UP,
        params: {},
      });
    });

    it('hops into ONBOARDING.ROOT for kyc', () => {
      getRoute()(
        { type: 'kyc', url: 'https://verify.immersve.com/abc' },
        { countryKey: 'GB', navigateFromRoot: true },
      );

      expect(mockSetSignInLinkStage).toHaveBeenCalledWith('identity');
      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ONBOARDING.ROOT, {
        screen: Routes.CARD.ONBOARDING.KYC_PROCESSING,
        params: { countryKey: 'GB', kycUrl: 'https://verify.immersve.com/abc' },
      });
    });

    it('hops into ONBOARDING.ROOT for funding', () => {
      getRoute()(
        {
          type: 'funding',
          write: {
            abi: [],
            contractAddress: '0x',
            method: 'approve',
            params: {},
          },
        },
        {
          countryKey: 'GB',
          navigateFromRoot: true,
          fundingAddress: '0xFunding',
        },
      );

      expect(mockSetSignInLinkStage).toHaveBeenCalledWith('spending');
      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ONBOARDING.ROOT, {
        screen: Routes.CARD.ONBOARDING.FUNDING_APPROVAL,
        params: { countryKey: 'GB', fundingAddress: '0xFunding' },
      });
    });

    it('still resets to Card Home for funding when the user already has a card', () => {
      getRoute()(
        {
          type: 'funding',
          write: {
            abi: [],
            contractAddress: '0x',
            method: 'approve',
            params: {},
          },
        },
        {
          countryKey: 'GB',
          navigateFromRoot: true,
          hasExistingCard: true,
          fundingAddress: '0xFunding',
        },
      );

      expect(mockSetSignInLinkStage).toHaveBeenCalledWith('spending');
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: Routes.CARD.HOME }],
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('navigates into ONBOARDING.ROOT KYC_FAILED for rejected (no parent reset)', () => {
      getRoute()(
        { type: 'rejected', canRetry: false },
        { navigateFromRoot: true },
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ONBOARDING.ROOT, {
        screen: Routes.CARD.ONBOARDING.KYC_FAILED,
      });
      expect(mockReset).not.toHaveBeenCalled();
    });

    it('still resets to Card Home for active', () => {
      getRoute()(
        { type: 'active' },
        { navigateFromRoot: true, showAccountExistsToast: false },
      );

      expect(mockMarkMigrationCompleted).toHaveBeenCalledTimes(1);
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: Routes.CARD.HOME }],
      });
    });
  });

  describe('navigateFromOutsideCard (caller outside the Card navigator)', () => {
    const cardRootOnboarding = (
      screen: string,
      params?: Record<string, unknown>,
    ) => [
      Routes.CARD.ROOT,
      {
        screen: Routes.CARD.HOME,
        params: {
          screen: Routes.CARD.ONBOARDING.ROOT,
          params: params === undefined ? { screen } : { screen, params },
        },
        returnToCaller: true,
      },
    ];

    it('routes contact through the Card root to SignUp', () => {
      getRoute()(
        { type: 'contact', needsEmail: true, needsPhone: true },
        { navigateFromOutsideCard: true },
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        ...cardRootOnboarding(Routes.CARD.ONBOARDING.SIGN_UP, {}),
      );
      expect(mockReset).not.toHaveBeenCalled();
    });

    it('forwards the KYC url through the Card root', () => {
      getRoute()(
        { type: 'kyc', url: 'https://verify.immersve.com/abc' },
        { countryKey: 'GB', navigateFromOutsideCard: true },
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        ...cardRootOnboarding(Routes.CARD.ONBOARDING.KYC_PROCESSING, {
          countryKey: 'GB',
          kycUrl: 'https://verify.immersve.com/abc',
        }),
      );
    });

    it('routes expected spend through the Card root to KYC processing', () => {
      getRoute()(
        { type: 'expected_spend' },
        { countryKey: 'GB', navigateFromOutsideCard: true },
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        ...cardRootOnboarding(Routes.CARD.ONBOARDING.KYC_PROCESSING, {
          countryKey: 'GB',
          kycUrl: undefined,
        }),
      );
    });

    it('forwards the country through the Card root to funding approval', () => {
      getRoute()(
        {
          type: 'funding',
          write: {
            abi: [],
            contractAddress: '0x',
            method: 'approve',
            params: {},
          },
        },
        { countryKey: 'GB', navigateFromOutsideCard: true },
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        ...cardRootOnboarding(Routes.CARD.ONBOARDING.FUNDING_APPROVAL, {
          countryKey: 'GB',
        }),
      );
    });

    it('routes a rejected identity check through the Card root', () => {
      getRoute()(
        { type: 'rejected', canRetry: false },
        { navigateFromOutsideCard: true },
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        ...cardRootOnboarding(Routes.CARD.ONBOARDING.KYC_FAILED),
      );
      expect(mockReset).not.toHaveBeenCalled();
    });

    it('opens Card Home through the Card root when the card is active', () => {
      getRoute()(
        { type: 'active' },
        { navigateFromOutsideCard: true, showAccountExistsToast: false },
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
        screen: Routes.CARD.HOME,
        returnToCaller: true,
      });
      expect(mockReset).not.toHaveBeenCalled();
    });
  });
});
