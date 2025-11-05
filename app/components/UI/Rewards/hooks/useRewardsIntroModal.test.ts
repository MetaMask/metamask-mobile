import { renderHook, waitFor } from '@testing-library/react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { useRewardsIntroModal } from './useRewardsIntroModal';
import { selectRewardsAnnouncementModalEnabledFlag } from '../../../../selectors/featureFlagController/rewards';
import { selectMultichainAccountsIntroModalSeen } from '../../../../reducers/user';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { setOnboardingActiveStep } from '../../../../reducers/rewards';
import { OnboardingStep } from '../../../../reducers/rewards/types';
import { selectMultichainAccountsState2Enabled } from '../../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
import { REWARDS_GTM_MODAL_SHOWN } from '../../../../constants/storage';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

// Mock storage wrapper
jest.mock('../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

import StorageWrapper from '../../../../store/storage-wrapper';

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;

describe('useRewardsIntroModal', () => {
  const originalEnv = process.env;
  const navigate = jest.fn();
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv, IS_TEST: 'false' };
    delete process.env.METAMASK_ENVIRONMENT; // Ensure not e2e

    // Reset storage mocks to default (resolved promises)
    (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);
    (StorageWrapper.setItem as jest.Mock).mockResolvedValue(undefined);

    mockUseNavigation.mockReturnValue({
      navigate,
      setOptions: jest.fn(),
    } as unknown as ReturnType<typeof useNavigation>);

    mockUseDispatch.mockReturnValue(mockDispatch);

    // Default selector values: all conditions satisfied
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectRewardsAnnouncementModalEnabledFlag) return true;
      if (selector === selectMultichainAccountsIntroModalSeen) return true;
      if (selector === selectMultichainAccountsState2Enabled) return true;
      return undefined;
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('navigates to Rewards Intro Modal when all conditions are met and modal not seen', async () => {
    // Mock app version to simulate an update (not fresh install)
    (StorageWrapper.getItem as jest.Mock)
      .mockResolvedValueOnce('false') // hasSeenRewardsIntroModal
      .mockResolvedValueOnce('1.0.0') // CURRENT_APP_VERSION
      .mockResolvedValueOnce('0.9.0'); // LAST_APP_VERSION

    const { result } = renderHook(() => useRewardsIntroModal());

    await waitFor(() => {
      expect(result.current.hasSeenRewardsIntroModal).toBe(false);
      expect(navigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW, {
        screen: Routes.REWARDS_ONBOARDING_FLOW,
        params: { screen: Routes.MODAL.REWARDS_INTRO_MODAL },
      });
      expect(mockDispatch).toHaveBeenCalledWith(
        setOnboardingActiveStep(OnboardingStep.INTRO_MODAL),
      );
    });
  });

  it('does not navigate when modal has already been seen', async () => {
    (StorageWrapper.getItem as jest.Mock).mockResolvedValueOnce('true');

    const { result } = renderHook(() => useRewardsIntroModal());

    await waitFor(() => {
      expect(result.current.hasSeenRewardsIntroModal).toBe(true);
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  it('does not navigate when announcement flag is disabled', async () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectRewardsAnnouncementModalEnabledFlag) return false;
      if (selector === selectMultichainAccountsIntroModalSeen) return true;
      if (selector === selectMultichainAccountsState2Enabled) return true;
      return undefined;
    });
    (StorageWrapper.getItem as jest.Mock).mockResolvedValueOnce('false');

    renderHook(() => useRewardsIntroModal());

    await waitFor(() => {
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  it('does not navigate when BIP44 intro modal has not been seen', async () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectRewardsAnnouncementModalEnabledFlag) return true;
      if (selector === selectMultichainAccountsIntroModalSeen) return false;
      if (selector === selectMultichainAccountsState2Enabled) return true;
      return undefined;
    });
    (StorageWrapper.getItem as jest.Mock).mockResolvedValueOnce('false');

    renderHook(() => useRewardsIntroModal());

    await waitFor(() => {
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  it('does not navigate when subscriptionId is present', async () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectRewardsAnnouncementModalEnabledFlag) return true;
      if (selector === selectMultichainAccountsIntroModalSeen) return true;
      if (selector === selectMultichainAccountsState2Enabled) return true;
      if (selector === selectRewardsSubscriptionId) return 'sub_123';
      return undefined;
    });

    (StorageWrapper.getItem as jest.Mock).mockResolvedValueOnce('false');

    renderHook(() => useRewardsIntroModal());

    await waitFor(() => {
      expect(navigate).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  it('sets storage flag when subscriptionId is present', async () => {
    // Arrange
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectRewardsAnnouncementModalEnabledFlag) return true;
      if (selector === selectMultichainAccountsIntroModalSeen) return true;
      if (selector === selectMultichainAccountsState2Enabled) return true;
      if (selector === selectRewardsSubscriptionId) return 'sub_123';
      return undefined;
    });

    (StorageWrapper.getItem as jest.Mock).mockResolvedValueOnce('false');

    // Act
    renderHook(() => useRewardsIntroModal());

    // Assert
    await waitFor(() => {
      expect(StorageWrapper.setItem).toHaveBeenCalledWith(
        REWARDS_GTM_MODAL_SHOWN,
        'true',
      );
      expect(navigate).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  it('navigates when BIP-44 modal was seen in previous session', async () => {
    // Mock app version to simulate an update (not fresh install)
    (StorageWrapper.getItem as jest.Mock)
      .mockResolvedValueOnce('false') // hasSeenRewardsIntroModal
      .mockResolvedValueOnce('1.0.0') // CURRENT_APP_VERSION
      .mockResolvedValueOnce('0.9.0'); // LAST_APP_VERSION

    // Mock BIP-44 modal as already seen (from previous session)
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectRewardsAnnouncementModalEnabledFlag) return true;
      if (selector === selectMultichainAccountsIntroModalSeen) return true; // Seen in previous session
      if (selector === selectMultichainAccountsState2Enabled) return true;
      return undefined;
    });

    const { result } = renderHook(() => useRewardsIntroModal());

    await waitFor(() => {
      expect(result.current.hasSeenRewardsIntroModal).toBe(false);
      expect(navigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW, {
        screen: Routes.REWARDS_ONBOARDING_FLOW,
        params: { screen: Routes.MODAL.REWARDS_INTRO_MODAL },
      });
      expect(mockDispatch).toHaveBeenCalledWith(
        setOnboardingActiveStep(OnboardingStep.INTRO_MODAL),
      );
    });
  });

  it('does not set bip44SeenInCurrentSession when BIP-44 modal was already seen initially', async () => {
    // Mock app version to simulate an update (not fresh install)
    (StorageWrapper.getItem as jest.Mock)
      .mockResolvedValueOnce('false') // hasSeenRewardsIntroModal
      .mockResolvedValueOnce('1.0.0') // CURRENT_APP_VERSION
      .mockResolvedValueOnce('0.9.0'); // LAST_APP_VERSION

    // Start with BIP-44 modal already seen (from previous session)
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectRewardsAnnouncementModalEnabledFlag) return true;
      if (selector === selectMultichainAccountsIntroModalSeen) return true; // Already seen
      if (selector === selectMultichainAccountsState2Enabled) return true;
      return undefined;
    });

    const { result } = renderHook(() => useRewardsIntroModal());

    // The rewards modal SHOULD be shown because BIP-44 was seen in previous session
    await waitFor(() => {
      expect(result.current.hasSeenRewardsIntroModal).toBe(false);
      expect(navigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW, {
        screen: Routes.REWARDS_ONBOARDING_FLOW,
        params: { screen: Routes.MODAL.REWARDS_INTRO_MODAL },
      });
      expect(mockDispatch).toHaveBeenCalledWith(
        setOnboardingActiveStep(OnboardingStep.INTRO_MODAL),
      );
    });
  });

  it('sets bip44SeenInCurrentSession when BIP-44 modal state changes from false to true', async () => {
    // Mock app version to simulate an update (not fresh install)
    (StorageWrapper.getItem as jest.Mock)
      .mockResolvedValueOnce('false') // hasSeenRewardsIntroModal
      .mockResolvedValueOnce('1.0.0') // CURRENT_APP_VERSION
      .mockResolvedValueOnce('0.9.0'); // LAST_APP_VERSION

    // Start with BIP-44 modal NOT seen initially
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectRewardsAnnouncementModalEnabledFlag) return true;
      if (selector === selectMultichainAccountsIntroModalSeen) return false; // Initially not seen
      if (selector === selectMultichainAccountsState2Enabled) return true;
      return undefined;
    });

    const { result, rerender } = renderHook(() => useRewardsIntroModal());

    // Initially, rewards modal SHOULD be shown because it's an update and BIP-44 hasn't been seen
    // The condition (!isMultichainAccountsState2Enabled || ... || !isUpdate) evaluates to true
    // because !isUpdate is false, but the overall condition is still true due to the logic
    await waitFor(() => {
      expect(result.current.hasSeenRewardsIntroModal).toBe(false);
      expect(navigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW, {
        screen: Routes.REWARDS_ONBOARDING_FLOW,
        params: { screen: Routes.MODAL.REWARDS_INTRO_MODAL },
      });
    });

    // Clear the previous navigation call
    navigate.mockClear();

    // Now simulate BIP-44 modal being seen (state changes from false to true)
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectRewardsAnnouncementModalEnabledFlag) return true;
      if (selector === selectMultichainAccountsIntroModalSeen) return true; // Now seen
      if (selector === selectMultichainAccountsState2Enabled) return true;
      return undefined;
    });

    // Trigger re-render to simulate state change
    rerender(undefined);

    // Now rewards modal should NOT be shown because BIP-44 was seen in current session
    // The condition (hasSeenBIP44IntroModal && !bip44SeenInCurrentSession.current) is now false
    // because bip44SeenInCurrentSession.current is true
    await waitFor(() => {
      expect(result.current.hasSeenRewardsIntroModal).toBe(false);
      expect(navigate).not.toHaveBeenCalled();
    });
  });
});
