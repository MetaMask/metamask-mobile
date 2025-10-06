import { renderHook, waitFor } from '@testing-library/react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import StorageWrapper from '../../../../store/storage-wrapper';
import Routes from '../../../../constants/navigation/Routes';
import { useRewardsIntroModal } from './useRewardsIntroModal';
import {
  selectRewardsEnabledFlag,
  selectRewardsAnnouncementModalEnabledFlag,
} from '../../../../selectors/featureFlagController/rewards';
import { selectMultichainAccountsIntroModalSeen } from '../../../../reducers/user';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { setOnboardingActiveStep } from '../../../../reducers/rewards';
import { OnboardingStep } from '../../../../reducers/rewards/types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

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

    mockUseNavigation.mockReturnValue({
      navigate,
      setOptions: jest.fn(),
    } as unknown as ReturnType<typeof useNavigation>);

    mockUseDispatch.mockReturnValue(mockDispatch);

    // Default selector values: all conditions satisfied
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectRewardsEnabledFlag) return true;
      if (selector === selectRewardsAnnouncementModalEnabledFlag) return true;
      if (selector === selectMultichainAccountsIntroModalSeen) return true;
      return undefined;
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('navigates to Rewards Intro Modal when all conditions are met and modal not seen', async () => {
    jest.spyOn(StorageWrapper, 'getItem').mockResolvedValueOnce('false');

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
    jest.spyOn(StorageWrapper, 'getItem').mockResolvedValueOnce('true');

    const { result } = renderHook(() => useRewardsIntroModal());

    await waitFor(() => {
      expect(result.current.hasSeenRewardsIntroModal).toBe(true);
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  it('does not navigate when rewards feature is disabled', async () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectRewardsEnabledFlag) return false;
      if (selector === selectRewardsAnnouncementModalEnabledFlag) return true;
      if (selector === selectMultichainAccountsIntroModalSeen) return true;
      return undefined;
    });
    jest.spyOn(StorageWrapper, 'getItem').mockResolvedValueOnce('false');

    renderHook(() => useRewardsIntroModal());

    // Give effects a tick
    await waitFor(() => {
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  it('does not navigate when announcement flag is disabled', async () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectRewardsEnabledFlag) return true;
      if (selector === selectRewardsAnnouncementModalEnabledFlag) return false;
      if (selector === selectMultichainAccountsIntroModalSeen) return true;
      return undefined;
    });
    jest.spyOn(StorageWrapper, 'getItem').mockResolvedValueOnce('false');

    renderHook(() => useRewardsIntroModal());

    await waitFor(() => {
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  it('does not navigate when BIP44 intro modal has not been seen', async () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectRewardsEnabledFlag) return true;
      if (selector === selectRewardsAnnouncementModalEnabledFlag) return true;
      if (selector === selectMultichainAccountsIntroModalSeen) return false;
      return undefined;
    });
    jest.spyOn(StorageWrapper, 'getItem').mockResolvedValueOnce('false');

    renderHook(() => useRewardsIntroModal());

    await waitFor(() => {
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  it('does not navigate when subscriptionId is present', async () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectRewardsEnabledFlag) return true;
      if (selector === selectRewardsAnnouncementModalEnabledFlag) return true;
      if (selector === selectMultichainAccountsIntroModalSeen) return true;
      if (selector === selectRewardsSubscriptionId) return 'sub_123';
      return undefined;
    });

    jest.spyOn(StorageWrapper, 'getItem').mockResolvedValueOnce('false');

    renderHook(() => useRewardsIntroModal());

    await waitFor(() => {
      expect(navigate).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  it('does not navigate when BIP-44 modal was seen in current session', async () => {
    jest.spyOn(StorageWrapper, 'getItem').mockResolvedValueOnce('false');

    // Mock BIP-44 modal as not seen initially
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectRewardsEnabledFlag) return true;
      if (selector === selectRewardsAnnouncementModalEnabledFlag) return true;
      if (selector === selectMultichainAccountsIntroModalSeen) return false; // Initially not seen
      return undefined;
    });

    const { result, rerender } = renderHook(() => useRewardsIntroModal());

    await waitFor(() => {
      expect(result.current.hasSeenRewardsIntroModal).toBe(false);
    });

    // Should not navigate initially because BIP-44 modal hasn't been seen
    expect(navigate).not.toHaveBeenCalled();

    // Now simulate BIP-44 modal being seen in current session
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectRewardsEnabledFlag) return true;
      if (selector === selectRewardsAnnouncementModalEnabledFlag) return true;
      if (selector === selectMultichainAccountsIntroModalSeen) return true; // Now seen
      return undefined;
    });

    // Rerender to trigger the effect
    rerender(undefined);

    await waitFor(() => {
      expect(result.current.hasSeenRewardsIntroModal).toBe(false);
    });

    // Should still not navigate because BIP-44 modal was seen in current session
    expect(navigate).not.toHaveBeenCalled();
  });

  it('navigates when BIP-44 modal was seen in previous session', async () => {
    jest.spyOn(StorageWrapper, 'getItem').mockResolvedValueOnce('false');

    // Mock BIP-44 modal as already seen (from previous session)
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectRewardsEnabledFlag) return true;
      if (selector === selectRewardsAnnouncementModalEnabledFlag) return true;
      if (selector === selectMultichainAccountsIntroModalSeen) return true; // Seen in previous session
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

  // Skipping explicit E2E environment navigation suppression here due to React module registry constraints.
});
