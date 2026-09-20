import { act, renderHook } from '@testing-library/react-hooks';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectRewardsMoneyControllerEnabled } from '../../../../selectors/featureFlagController/rewardsMoneyController';
import type { RootState } from '../../../../reducers';
import type {
  ReferralMeDto,
  ReferralVariant,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { useReferralMe } from './useReferralMe';
import { useRewardsMoneyTabRouting } from './useRewardsMoneyTabRouting';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('./useReferralMe', () => ({
  useReferralMe: jest.fn(),
}));

const PROFILE_A = 'profile-a';
const PROFILE_B = 'profile-b';

describe('useRewardsMoneyTabRouting', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
    typeof useFocusEffect
  >;
  const mockUseReferralMe = useReferralMe as jest.MockedFunction<
    typeof useReferralMe
  >;

  let moneyEnabled: boolean;
  let profileId: string | undefined;
  let state: RootState;
  let resolveFetch: (result: {
    status: 'settled' | 'discarded';
    profileId?: string;
  }) => void;
  let rejectFetch: (error: Error) => void;
  const mockFetchReferralMe = jest.fn();

  const buildState = (
    referralMe: Record<string, { variant: ReferralVariant } | undefined> = {},
  ) =>
    ({
      rewardsMoney: {
        referralMe: Object.fromEntries(
          Object.entries(referralMe).map(([id, value]) => [
            id,
            {
              loading: false,
              error: false,
              data: value
                ? ({ variant: value.variant } as ReferralMeDto)
                : null,
            },
          ]),
        ),
      },
    }) as unknown as RootState;

  beforeEach(() => {
    jest.clearAllMocks();
    moneyEnabled = true;
    profileId = PROFILE_A;
    state = buildState();
    resolveFetch = () => undefined;
    rejectFetch = () => undefined;

    mockFetchReferralMe.mockImplementation(
      () =>
        new Promise<{
          status: 'settled' | 'discarded';
          profileId?: string;
        }>((resolve, reject) => {
          resolveFetch = resolve;
          rejectFetch = reject;
        }),
    );
    mockUseReferralMe.mockImplementation(() => ({
      profileId,
      fetchReferralMe: mockFetchReferralMe,
    }));
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectRewardsMoneyControllerEnabled) {
        return moneyEnabled;
      }
      return (selector as (s: RootState) => unknown)(state);
    });
  });

  const render = () => {
    const view = renderHook(() => useRewardsMoneyTabRouting());
    return view;
  };

  const triggerFocus = () => {
    const focusCallback =
      mockUseFocusEffect.mock.calls[
        mockUseFocusEffect.mock.calls.length - 1
      ][0];
    let cleanup: void | (() => void) | undefined;
    act(() => {
      cleanup = focusCallback();
    });
    return cleanup;
  };

  const settleFetch = async () => {
    await act(async () => {
      resolveFetch({ status: 'settled', profileId });
    });
  };

  it('reports the money flag from the shared feature-flag selector', () => {
    moneyEnabled = false;

    const { result } = render();

    expect(result.current.moneyEnabled).toBe(false);
  });

  it('does not fetch referral me when money is disabled', () => {
    moneyEnabled = false;

    render();
    triggerFocus();

    expect(mockFetchReferralMe).not.toHaveBeenCalled();
  });

  it('never waits on the referral persona when money is disabled', () => {
    moneyEnabled = false;

    const { result } = render();
    triggerFocus();

    // Disabled means nothing will ever settle, so the gate must be open.
    expect(result.current.moneyReferralResolved).toBe(true);
  });

  it('fetches referral me on focus when money is enabled', () => {
    render();
    triggerFocus();

    expect(mockFetchReferralMe).toHaveBeenCalledTimes(1);
  });

  it('reports unresolved until the first fetch settles', async () => {
    const { result } = render();
    triggerFocus();

    expect(result.current.moneyReferralResolved).toBe(false);

    await settleFetch();

    expect(result.current.moneyReferralResolved).toBe(true);
  });

  it('stays resolved while a subsequent focus refresh is in flight', async () => {
    const fetchResolvers: ((result: {
      status: 'settled';
      profileId: string | undefined;
    }) => void)[] = [];
    mockFetchReferralMe.mockImplementation(
      () =>
        new Promise((resolve) => {
          fetchResolvers.push(resolve);
        }),
    );

    const { result } = render();
    triggerFocus();
    await act(async () => {
      fetchResolvers[0]({ status: 'settled', profileId: PROFILE_A });
    });
    expect(result.current.moneyReferralResolved).toBe(true);

    triggerFocus();

    expect(mockFetchReferralMe).toHaveBeenCalledTimes(2);
    expect(result.current.moneyReferralResolved).toBe(true);
  });

  it('resolves when the fetch rejects', async () => {
    const { result } = render();
    triggerFocus();

    await act(async () => {
      rejectFetch(new Error('Session unavailable'));
    });

    expect(result.current.moneyReferralResolved).toBe(true);
  });

  it('resolves for a signed-out session that never yields a profile id', async () => {
    profileId = undefined;

    const { result } = render();
    triggerFocus();
    await settleFetch();

    expect(result.current.moneyReferralResolved).toBe(true);
    expect(result.current.moneyVariant).toBeUndefined();
  });

  it('keeps routing unresolved after discarding profile A and fetches profile B', async () => {
    const fetchResolvers: ((result: {
      status: 'settled' | 'discarded';
      profileId?: string;
    }) => void)[] = [];
    mockFetchReferralMe.mockImplementation(
      () =>
        new Promise((resolve) => {
          fetchResolvers.push(resolve);
        }),
    );

    const { result } = render();
    triggerFocus();

    await act(async () => {
      profileId = PROFILE_B;
      fetchResolvers[0]({
        status: 'discarded',
        profileId: PROFILE_B,
      });
      await Promise.resolve();
    });

    expect(mockFetchReferralMe).toHaveBeenCalledTimes(2);
    expect(result.current.moneyReferralResolved).toBe(false);

    await act(async () => {
      fetchResolvers[1]({ status: 'settled', profileId: PROFILE_B });
    });

    expect(result.current.moneyReferralResolved).toBe(true);
  });

  it('reads the persona for the resolved profile id', async () => {
    state = buildState({ [PROFILE_A]: { variant: 'REFERRER' } });

    const { result } = render();
    triggerFocus();
    await settleFetch();

    expect(result.current.moneyVariant).toBe('REFERRER');
  });

  it('ignores a persona stored under another profile id', async () => {
    state = buildState({ [PROFILE_B]: { variant: 'REFERRER' } });

    const { result } = render();
    triggerFocus();
    await settleFetch();

    expect(result.current.moneyVariant).toBeUndefined();
  });

  describe('navigator remount key', () => {
    it('changes when the persona moves from rewards to Money', async () => {
      state = buildState({ [PROFILE_A]: { variant: 'NONE' } });

      const { result, rerender } = render();
      triggerFocus();
      await settleFetch();
      const rewardsKey = result.current.navigatorKey;

      state = buildState({ [PROFILE_A]: { variant: 'REFEREE' } });
      await act(async () => {
        rerender();
      });

      expect(result.current.navigatorKey).not.toBe(rewardsKey);
      expect(result.current.navigatorKey).toContain('rewards-money');
    });

    it('does not change between REFERRER and REFEREE', async () => {
      state = buildState({ [PROFILE_A]: { variant: 'REFERRER' } });

      const { result, rerender } = render();
      triggerFocus();
      await settleFetch();
      const referrerKey = result.current.navigatorKey;

      state = buildState({ [PROFILE_A]: { variant: 'REFEREE' } });
      await act(async () => {
        rerender();
      });

      expect(result.current.navigatorKey).toBe(referrerKey);
    });

    it('changes when the resolved profile changes', async () => {
      state = buildState({ [PROFILE_A]: { variant: 'NONE' } });

      const { result, rerender } = render();
      triggerFocus();
      await settleFetch();
      const profileAKey = result.current.navigatorKey;

      profileId = PROFILE_B;
      state = buildState({ [PROFILE_B]: { variant: 'NONE' } });
      await act(async () => {
        rerender();
      });

      expect(result.current.moneyReferralResolved).toBe(false);
      expect(result.current.navigatorKey).not.toBe(profileAKey);
    });
  });
});
