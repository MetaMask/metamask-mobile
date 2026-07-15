import { finalizeOnboardingCompletion } from './finalizeOnboardingCompletion';
import {
  AccountType,
  ONBOARDING_SUCCESS_FLOW,
} from '../../constants/onboarding';
import { clearAttribution } from '../../core/redux/slices/attribution';
import { setWalletHomeOnboardingStepsEligible } from '../../actions/onboarding';
import { analytics } from '../analytics/analytics';
import { discoverAccounts } from '../../multichain-accounts/discovery';
import Logger from '../Logger';

jest.mock('../analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
}));
jest.mock('../../multichain-accounts/discovery', () => ({
  discoverAccounts: jest.fn().mockResolvedValue(0),
}));

const mockProvisionFromMetadata = jest.fn().mockResolvedValue(undefined);

jest.mock('../../core/Engine/Engine', () => ({
  context: {
    KeyringController: {
      state: {
        keyrings: [{ metadata: { id: 'mock-keyring-id' } }],
      },
    },
    QrSyncProvisioningService: {
      provisionFromMetadata: (...args: unknown[]) =>
        mockProvisionFromMetadata(...args),
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
    mockProvisionFromMetadata.mockResolvedValue(undefined);
  });

  it('tracks ONBOARDING_COMPLETED via analytics.trackEvent for eligible flows', () => {
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

  it('calls provisionFromMetadata instead of discoverAccounts when needsQrProvisioning is true', () => {
    finalizeOnboardingCompletion({
      successFlow: ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE,
      accountType: AccountType.Imported,
      isBasicFunctionalityEnabled: true,
      walletSetupAttributionProps: {},
      dispatch: mockDispatch,
      needsQrProvisioning: true,
    });

    expect(mockProvisionFromMetadata).toHaveBeenCalledTimes(1);
    expect(mockDiscoverAccounts).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(clearAttribution());
  });

  it('logs when provisionFromMetadata rejects', async () => {
    const loggerSpy = jest.spyOn(Logger, 'error').mockImplementation(() => {
      // no-op
    });
    mockProvisionFromMetadata.mockRejectedValueOnce(
      new Error('provisioning failed'),
    );

    finalizeOnboardingCompletion({
      successFlow: ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE,
      accountType: AccountType.Imported,
      isBasicFunctionalityEnabled: true,
      walletSetupAttributionProps: {},
      dispatch: mockDispatch,
      needsQrProvisioning: true,
      discoverAccountsLogContext: 'TestContext',
    });

    await Promise.resolve();

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({
          feature: 'qr-sync',
          surface: 'import',
          operation: 'provision_from_metadata',
          source: 'TestContext',
        }),
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(clearAttribution());

    loggerSpy.mockRestore();
    mockProvisionFromMetadata.mockResolvedValue(undefined);
  });

  it('logs discoverAccounts failures with the provided context', async () => {
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
