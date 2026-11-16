import React from 'react';
import { Provider } from 'react-redux';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import configureStore from '../../../../util/test/configureStore';
import type { ReferralMeDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
// eslint-disable-next-line import-x/no-namespace
import * as SettingsSelectors from '../../../../selectors/settings';
// eslint-disable-next-line import-x/no-namespace
import * as RewardsMoneyFlagSelectors from '../../../../selectors/featureFlagController/rewardsMoneyController';
import { MONEY_REFERRAL_INVITE_LOAD_BUDGET_MS } from '../../../UI/Rewards/components/Money/PendingMoneyReferralInvite';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { useSocialPreviewReferralOffer } from './useSocialPreviewReferralOffer';

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

const expectSkipLogged = (reason: string) =>
  expect(DevLogger.log).toHaveBeenCalledWith(
    '[TraderPreviewSheet] Not offering the referral code',
    { referralCode: 'KOL1', reason },
  );

const PROFILE_ID = 'rewards-profile-1';
const mockFetchReferralMe = jest.fn();

jest.mock('../../../UI/Rewards/hooks/useGeoRewardsMetadata', () => ({
  useGeoRewardsMetadata: jest.fn(),
}));

jest.mock('../../../UI/Rewards/hooks/useReferralMe', () => ({
  useReferralMe: () => ({ fetchReferralMe: mockFetchReferralMe }),
}));

const buildReferralMe = (roles: ReferralMeDto['roles'] = []): ReferralMeDto =>
  ({ roles, excluded_regions: [] }) as unknown as ReferralMeDto;

const renderOffer = ({
  pendingReferralCode = 'KOL1',
  referralMe = buildReferralMe(),
}: {
  pendingReferralCode?: string | null;
  referralMe?: ReferralMeDto;
} = {}) => {
  const store = configureStore({
    rewardsMoney: {
      referralMe: {
        [PROFILE_ID]: { loading: false, error: false, data: referralMe },
      },
      pendingReferralCode,
    },
    rewards: { geoLocation: null },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(() => useSocialPreviewReferralOffer(), { wrapper });
};

describe('useSocialPreviewReferralOffer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(SettingsSelectors, 'selectBasicFunctionalityEnabled')
      .mockReturnValue(true);
    jest
      .spyOn(RewardsMoneyFlagSelectors, 'selectRewardsMoneyControllerEnabled')
      .mockReturnValue(true);
    mockFetchReferralMe.mockResolvedValue({
      status: 'settled',
      profileId: PROFILE_ID,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('offers nothing without a pending code', () => {
    const { result } = renderOffer({ pendingReferralCode: null });

    expect(result.current).toEqual({
      status: 'none',
      pendingReferralCode: null,
    });
    expect(mockFetchReferralMe).not.toHaveBeenCalled();
  });

  it('offers the code to a user who can still be referred', async () => {
    const { result } = renderOffer();

    expect(result.current.status).toBe('checking');
    await waitFor(() => expect(result.current.status).toBe('offered'));
    expect(result.current.pendingReferralCode).toBe('KOL1');
    expect(DevLogger.log).not.toHaveBeenCalled();
    expect(mockFetchReferralMe).toHaveBeenCalledWith({ forceFresh: true });
  });

  it('does not offer the code to a user who was already referred', async () => {
    const { result } = renderOffer({
      referralMe: buildReferralMe(['REFEREE']),
    });

    await waitFor(() => expect(result.current.status).toBe('none'));
    expectSkipLogged('already_referred');
  });

  it('does not offer the code when Rewards Money is disabled', () => {
    jest
      .spyOn(RewardsMoneyFlagSelectors, 'selectRewardsMoneyControllerEnabled')
      .mockReturnValue(false);

    const { result } = renderOffer();

    expect(result.current.status).toBe('none');
    expect(mockFetchReferralMe).not.toHaveBeenCalled();
    expectSkipLogged('rewards_money_off');
  });

  it('does not offer the code when the read fails', async () => {
    mockFetchReferralMe.mockRejectedValue(new Error('offline'));

    const { result } = renderOffer();

    await waitFor(() => expect(result.current.status).toBe('none'));
    expectSkipLogged('read_failed');
  });

  it('gives up when the read outlasts the load budget', () => {
    jest.useFakeTimers();
    mockFetchReferralMe.mockReturnValue(new Promise(() => undefined));

    const { result } = renderOffer();
    act(() => {
      jest.advanceTimersByTime(MONEY_REFERRAL_INVITE_LOAD_BUDGET_MS);
    });

    expect(result.current.status).toBe('none');
    expectSkipLogged('read_timed_out');
  });
});
