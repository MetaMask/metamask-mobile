import { renderHook, act } from '@testing-library/react-hooks';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { REFERRAL_ME_CACHE_THRESHOLD_MS } from '../../../../core/Engine/controllers/rewards-money-controller/RewardsMoneyController';
import type { ReferralMeDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { setReferralMe } from '../../../../reducers/rewardsMoney';
import { selectRewardsMoneyControllerEnabled } from '../../../../selectors/featureFlagController/rewardsMoneyController';
import { usePrefetchRewardsIdentity } from './usePrefetchRewardsIdentity';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: { call: jest.fn() },
    context: {
      RewardsMoneyController: {
        state: { referralMe: {} as Record<string, unknown> },
      },
    },
  },
}));

const PROFILE_ID = 'profile-a';

const referralMe = {
  roles: ['REFERRER'],
  ui_variant: 'REFERRER',
} as ReferralMeDto;

describe('usePrefetchRewardsIdentity', () => {
  const mockDispatch = jest.fn();
  const mockCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;
  let moneyEnabled = true;

  beforeEach(() => {
    jest.clearAllMocks();
    moneyEnabled = true;
    Engine.context.RewardsMoneyController.state.referralMe = {};
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    (useSelector as jest.Mock).mockImplementation((selector: unknown) => {
      if (selector === selectRewardsMoneyControllerEnabled) {
        return moneyEnabled;
      }
      return undefined;
    });
    mockCall.mockImplementation(((action: string) => {
      if (action === 'AuthenticationController:getSessionProfile') {
        return Promise.resolve({ profileId: PROFILE_ID });
      }
      if (action === 'RewardsMoneyController:getReferralMe') {
        return Promise.resolve(referralMe);
      }
      return Promise.resolve(undefined);
    }) as typeof mockCall);
  });

  it('does nothing while Rewards Money is disabled', () => {
    moneyEnabled = false;

    renderHook(() => usePrefetchRewardsIdentity());

    expect(mockCall).not.toHaveBeenCalled();
  });

  it('copies a fresh controller cache and does not fetch', async () => {
    Engine.context.RewardsMoneyController.state.referralMe = {
      [PROFILE_ID]: { payload: referralMe, lastFetched: Date.now() },
    };

    renderHook(() => usePrefetchRewardsIdentity());
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockCall).toHaveBeenCalledWith(
      'AuthenticationController:getSessionProfile',
    );
    expect(mockCall).not.toHaveBeenCalledWith(
      'RewardsMoneyController:getReferralMe',
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setReferralMe({ profileId: PROFILE_ID, data: referralMe }),
    );
  });

  it('fetches when the controller cache is older than the threshold', async () => {
    Engine.context.RewardsMoneyController.state.referralMe = {
      [PROFILE_ID]: {
        payload: referralMe,
        lastFetched: Date.now() - REFERRAL_ME_CACHE_THRESHOLD_MS - 1,
      },
    };

    renderHook(() => usePrefetchRewardsIdentity());
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockCall).toHaveBeenCalledWith(
      'RewardsMoneyController:getReferralMe',
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setReferralMe({ profileId: PROFILE_ID, data: referralMe }),
    );
  });

  it('does not store the payload when the session changes during the fetch', async () => {
    const profileIds = [PROFILE_ID, 'profile-b'];
    let sessionReads = 0;
    mockCall.mockImplementation(((action: string) => {
      if (action === 'AuthenticationController:getSessionProfile') {
        const profileId =
          profileIds[Math.min(sessionReads, profileIds.length - 1)];
        sessionReads += 1;
        return Promise.resolve({ profileId });
      }
      if (action === 'RewardsMoneyController:getReferralMe') {
        return Promise.resolve(referralMe);
      }
      return Promise.resolve(undefined);
    }) as typeof mockCall);

    renderHook(() => usePrefetchRewardsIdentity());
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(sessionReads).toBe(2);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('leaves Redux untouched when the fetch fails', async () => {
    mockCall.mockImplementation(((action: string) => {
      if (action === 'AuthenticationController:getSessionProfile') {
        return Promise.resolve({ profileId: PROFILE_ID });
      }
      return Promise.reject(new Error('offline'));
    }) as typeof mockCall);

    renderHook(() => usePrefetchRewardsIdentity());
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
