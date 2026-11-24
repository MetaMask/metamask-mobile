import { act, renderHook } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import { selectProfileControllerProfile } from '../../../../selectors/profileController';
import { selectAiSocialLeaderboardOnboardingEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import { canOpenSocialTabDirectly } from '../../../Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation';
import { useCanOpenSocialTabDirectly } from './useCanOpenSocialTabDirectly';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock(
  '../../../Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation',
  () => ({
    canOpenSocialTabDirectly: jest.fn(),
  }),
);

describe('useCanOpenSocialTabDirectly', () => {
  const unsubscribe = jest.fn();
  let emitFocus: (() => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    emitFocus = undefined;
    jest.mocked(useSelector).mockReturnValue(undefined);
    jest.mocked(canOpenSocialTabDirectly).mockReturnValue(false);
    jest.mocked(useNavigation).mockReturnValue({
      addListener: jest.fn((_event: string, listener: () => void) => {
        emitFocus = listener;
        return unsubscribe;
      }),
    } as unknown as ReturnType<typeof useNavigation>);
  });

  it('reads the gate on mount', () => {
    const { result } = renderHook(() => useCanOpenSocialTabDirectly(true));

    expect(result.current).toBe(false);
  });

  it('re-reads the gate when the tabs regain focus', () => {
    const { result } = renderHook(() => useCanOpenSocialTabDirectly(true));
    jest.mocked(canOpenSocialTabDirectly).mockReturnValue(true);

    act(() => emitFocus?.());

    expect(result.current).toBe(true);
  });

  it('re-reads the gate when the Social profile changes', () => {
    const { result, rerender } = renderHook(() =>
      useCanOpenSocialTabDirectly(true),
    );
    jest.mocked(canOpenSocialTabDirectly).mockReturnValue(true);
    jest
      .mocked(useSelector)
      .mockImplementation((selector) =>
        selector === selectProfileControllerProfile
          ? { profileId: 'profile-1' }
          : undefined,
      );

    rerender({});

    expect(result.current).toBe(true);
  });

  it('re-reads the gate when the Social V1 assignment resolves after mount', () => {
    const { result, rerender } = renderHook(
      ({ isSocialV1Enabled }) => useCanOpenSocialTabDirectly(isSocialV1Enabled),
      { initialProps: { isSocialV1Enabled: false } },
    );
    expect(result.current).toBe(true);
    expect(canOpenSocialTabDirectly).not.toHaveBeenCalled();

    rerender({ isSocialV1Enabled: true });

    expect(result.current).toBe(false);
  });

  it('re-reads the gate when the onboarding flag changes', () => {
    jest.mocked(canOpenSocialTabDirectly).mockReturnValue(true);
    const { result, rerender } = renderHook(() =>
      useCanOpenSocialTabDirectly(true),
    );
    jest.mocked(canOpenSocialTabDirectly).mockReturnValue(false);
    jest
      .mocked(useSelector)
      .mockImplementation((selector) =>
        selector === selectAiSocialLeaderboardOnboardingEnabled
          ? true
          : undefined,
      );

    rerender({});

    expect(result.current).toBe(false);
  });

  it('stops listening for focus on unmount', () => {
    const { unmount } = renderHook(() => useCanOpenSocialTabDirectly(true));

    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
