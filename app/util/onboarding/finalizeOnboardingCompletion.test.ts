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
import trackOnboarding from '../metrics/TrackOnboarding/trackOnboarding';
import { discoverAccounts } from '../../multichain-accounts/discovery';
import Logger from '../Logger';

jest.mock('../metrics/TrackOnboarding/trackOnboarding');
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

const mockTrackOnboarding = trackOnboarding as jest.MockedFunction<
  typeof trackOnboarding
>;
const mockDiscoverAccounts = discoverAccounts as jest.MockedFunction<
  typeof discoverAccounts
>;

describe('finalizeOnboardingCompletion', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tracks ONBOARDING_COMPLETED, marks steps eligible, discovers accounts, and clears attribution for eligible flows', () => {
    finalizeOnboardingCompletion({
      successFlow: ONBOARDING_SUCCESS_FLOW.NO_BACKED_UP_SRP,
      accountType: AccountType.Metamask,
      isBasicFunctionalityEnabled: true,
      walletSetupAttributionProps: { utm_source: 'email' },
      dispatch: mockDispatch,
      discoverAccountsLogContext: 'TestContext',
    });

    expect(mockTrackOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Onboarding Completed',
        properties: expect.objectContaining({
          wallet_setup_type: 'new',
          new_wallet: true,
          account_type: 'metamask',
          utm_source: 'email',
        }),
      }),
      expect.any(Function),
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

    expect(mockTrackOnboarding).not.toHaveBeenCalled();
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

    expect(mockTrackOnboarding).not.toHaveBeenCalled();
    expect(mockDiscoverAccounts).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('buffers onboarding event via saveOnboardingEvent when trackOnboarding save callback is invoked', () => {
    finalizeOnboardingCompletion({
      successFlow: ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE,
      accountType: AccountType.Imported,
      isBasicFunctionalityEnabled: true,
      walletSetupAttributionProps: {},
      dispatch: mockDispatch,
    });

    const saveCallback = mockTrackOnboarding.mock.calls[0]?.[1];
    expect(saveCallback).toBeDefined();

    const mockEvent = AnalyticsEventBuilder.createEventBuilder(
      MetaMetricsEvents.ONBOARDING_COMPLETED,
    ).build();
    saveCallback?.(mockEvent);

    expect(mockDispatch).toHaveBeenCalledWith(saveEvent([mockEvent]));
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
