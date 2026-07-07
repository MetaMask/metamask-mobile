import { finalizeOnboardingCompletion } from './finalizeOnboardingCompletion';
import {
  AccountType,
  ONBOARDING_SUCCESS_FLOW,
} from '../../constants/onboarding';
import { MetaMetricsEvents } from '../../core/Analytics';
import { clearAttribution } from '../../core/redux/slices/attribution';
import {
  saveOnboardingEvent as saveEvent,
  setWalletHomeOnboardingStepsEligible,
} from '../../actions/onboarding';
import { AnalyticsEventBuilder } from '../analytics/AnalyticsEventBuilder';
import { analytics } from '../analytics/analytics';
import { discoverAccounts } from '../../multichain-accounts/discovery';
import Logger from '../Logger';

jest.mock('../analytics/analytics', () => ({
  analytics: {
    isEnabled: jest.fn(),
    trackEvent: jest.fn(),
  },
}));
jest.mock('../../multichain-accounts/discovery', () => ({
  discoverAccounts: jest.fn().mockResolvedValue(0),
}));

jest.mock('../../core/Engine/Engine', () => ({
  context: {
    KeyringController: {
      state: {
        keyrings: [{ metadata: { id: 'mock-keyring-id' } }],
      },
    },
  },
}));

const mockAnalytics = analytics as jest.Mocked<typeof analytics>;
const mockDiscoverAccounts = discoverAccounts as jest.MockedFunction<
  typeof discoverAccounts
>;

describe('finalizeOnboardingCompletion', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tracks ONBOARDING_COMPLETED directly via analytics.trackEvent when analytics is enabled', () => {
    mockAnalytics.isEnabled.mockReturnValue(true);

    finalizeOnboardingCompletion({
      successFlow: ONBOARDING_SUCCESS_FLOW.NO_BACKED_UP_SRP,
      accountType: AccountType.Metamask,
      isBasicFunctionalityEnabled: true,
      walletSetupAttributionProps: { utm_source: 'email' },
      dispatch: mockDispatch,
      discoverAccountsLogContext: 'TestContext',
    });

    expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Onboarding Completed',
        properties: expect.objectContaining({
          wallet_setup_type: 'new',
          new_wallet: true,
          account_type: 'metamask',
          utm_source: 'email',
        }),
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setWalletHomeOnboardingStepsEligible(true, {
        skipInitialBalanceWait: true,
      }),
    );
    expect(mockDiscoverAccounts).toHaveBeenCalledWith('mock-keyring-id');
    expect(mockDispatch).toHaveBeenCalledWith(clearAttribution());
  });

  it('buffers event via dispatch when analytics is not enabled', () => {
    mockAnalytics.isEnabled.mockReturnValue(false);

    finalizeOnboardingCompletion({
      successFlow: ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE,
      accountType: AccountType.Imported,
      isBasicFunctionalityEnabled: true,
      walletSetupAttributionProps: {},
      dispatch: mockDispatch,
    });

    expect(mockAnalytics.trackEvent).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(
      saveEvent([
        expect.objectContaining({
          name: 'Onboarding Completed',
        }),
      ]),
    );
  });

  it('only clears attribution when successFlow is ineligible', () => {
    finalizeOnboardingCompletion({
      successFlow: ONBOARDING_SUCCESS_FLOW.SETTINGS_BACKUP,
      accountType: AccountType.Metamask,
      isBasicFunctionalityEnabled: true,
      walletSetupAttributionProps: {},
      dispatch: mockDispatch,
    });

    expect(mockAnalytics.trackEvent).not.toHaveBeenCalled();
    expect(mockDiscoverAccounts).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalledWith(
      setWalletHomeOnboardingStepsEligible(true, {
        skipInitialBalanceWait: true,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(clearAttribution());
  });

  it('no-ops when successFlow is undefined, preserving attribution for downstream screens', () => {
    finalizeOnboardingCompletion({
      successFlow: undefined,
      accountType: AccountType.Metamask,
      isBasicFunctionalityEnabled: true,
      walletSetupAttributionProps: {},
      dispatch: mockDispatch,
    });

    expect(mockAnalytics.trackEvent).not.toHaveBeenCalled();
    expect(mockDiscoverAccounts).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('logs discoverAccounts failures with the provided context', async () => {
    mockAnalytics.isEnabled.mockReturnValue(true);
    const loggerSpy = jest.spyOn(Logger, 'error').mockImplementation(() => {
      // no-op
    });
    mockDiscoverAccounts.mockRejectedValueOnce(new Error('discovery failed'));

    finalizeOnboardingCompletion({
      successFlow: ONBOARDING_SUCCESS_FLOW.BACKED_UP_SRP,
      accountType: AccountType.Metamask,
      isBasicFunctionalityEnabled: true,
      walletSetupAttributionProps: {},
      dispatch: mockDispatch,
      discoverAccountsLogContext: 'OnboardingSuccess',
    });

    await Promise.resolve();

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.any(Error),
      'OnboardingSuccess: discoverAccounts failed',
    );

    loggerSpy.mockRestore();
    mockDiscoverAccounts.mockResolvedValue(0);
  });
});
