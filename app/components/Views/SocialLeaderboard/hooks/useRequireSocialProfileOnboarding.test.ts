import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import { SocialEvent } from '../analytics/socialEvents';
import { selectProfileControllerLinkedEvmAddress } from '../../../../selectors/profileController';
import { useRequireSocialProfileOnboarding } from './useRequireSocialProfileOnboarding';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const GATE = { trigger: SocialEvent.OnboardingTrigger.FOLLOW };
const LINKED_ADDRESS = '0x1111111111111111111111111111111111111111';

const mockLinkedAddress = (linkedAddress: string | null) => {
  jest
    .mocked(useSelector)
    .mockImplementation((selector: unknown) =>
      selector === selectProfileControllerLinkedEvmAddress
        ? linkedAddress
        : undefined,
    );
};

describe('useRequireSocialProfileOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLinkedAddress(LINKED_ADDRESS);
  });

  it('returns false and navigates to onboarding when no linked wallet exists', () => {
    mockLinkedAddress(null);
    const { result } = renderHook(() => useRequireSocialProfileOnboarding());

    const canContinue = result.current.ensureSocialProfileOnboarding(GATE);

    expect(canContinue).toBe(false);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.PROFILE_ONBOARDING);
  });

  it('returns false and navigates to onboarding when the linked wallet is blank', () => {
    mockLinkedAddress('  ');
    const { result } = renderHook(() => useRequireSocialProfileOnboarding());

    const canContinue = result.current.ensureSocialProfileOnboarding(GATE);

    expect(canContinue).toBe(false);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.PROFILE_ONBOARDING);
  });

  it('hands the onboarding navigation to runNavigation when one is given', () => {
    mockLinkedAddress(null);
    const runNavigation = jest.fn();
    const { result } = renderHook(() =>
      useRequireSocialProfileOnboarding({ runNavigation }),
    );

    const canContinue = result.current.ensureSocialProfileOnboarding(GATE);

    expect(canContinue).toBe(false);
    expect(mockNavigate).not.toHaveBeenCalled();
    runNavigation.mock.calls[0][0]();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.PROFILE_ONBOARDING);
  });

  it('returns true without navigation when a linked wallet exists', () => {
    const { result } = renderHook(() => useRequireSocialProfileOnboarding());

    const canContinue = result.current.ensureSocialProfileOnboarding(GATE);

    expect(canContinue).toBe(true);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('records the gated trigger for onboarding and reports the block before navigating', () => {
    mockLinkedAddress(null);
    const onBlocked = jest.fn();
    const { result } = renderHook(() =>
      useRequireSocialProfileOnboarding({ onBlocked }),
    );

    result.current.ensureSocialProfileOnboarding({
      trigger: SocialEvent.OnboardingTrigger.COPY_TRADE,
      tradeType: SocialEvent.Trade.SPOT,
    });

    expect(onBlocked).toHaveBeenCalledWith({
      blocked_action: SocialEvent.OnboardingTrigger.COPY_TRADE,
      blocked_reason: SocialEvent.BlockedReason.PROFILE_ONBOARDING,
      trade_type: SocialEvent.Trade.SPOT,
    });
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.PROFILE_ONBOARDING,
      {
        trigger: SocialEvent.OnboardingTrigger.COPY_TRADE,
      },
    );
  });
});
