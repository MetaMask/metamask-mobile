import React from 'react';
import { Provider } from 'react-redux';
import { act, render, waitFor } from '@testing-library/react-native';
import configureStore from '../../../../../util/test/configureStore';
import Routes from '../../../../../constants/navigation/Routes';
import {
  setPendingReferralCode,
  type ReferralMeEntry,
} from '../../../../../reducers/rewardsMoney';
import type { ReferralMeDto } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
// eslint-disable-next-line import-x/no-namespace
import * as SettingsSelectors from '../../../../../selectors/settings';
// eslint-disable-next-line import-x/no-namespace
import * as RewardsMoneyFlagSelectors from '../../../../../selectors/featureFlagController/rewardsMoneyController';
import { useGeoRewardsMetadata } from '../../hooks/useGeoRewardsMetadata';
import PendingMoneyReferralInvite from './PendingMoneyReferralInvite';

const PROFILE_ID = 'profile-1';

const mockNavigate = jest.fn();
const mockGetCurrentRoute = jest.fn();
const mockFetchReferralMe = jest.fn();
const mockCancelInteractions = jest.fn();

jest.mock('../../../../../core/NavigationService', () => ({
  __esModule: true,
  default: {
    get navigation() {
      return { navigate: mockNavigate };
    },
    getCurrentRoute: () => mockGetCurrentRoute(),
  },
}));

jest.mock('../../hooks/useGeoRewardsMetadata', () => ({
  useGeoRewardsMetadata: jest.fn(),
}));

jest.mock('../../hooks/useReferralMe', () => ({
  useReferralMe: () => ({
    profileId: undefined,
    fetchReferralMe: mockFetchReferralMe,
  }),
}));

jest.mock('../../utils/runAfterInteractions', () => ({
  runAfterInteractions: (task: () => void) => {
    task();
    return { cancel: mockCancelInteractions };
  },
}));

const buildReferralMe = (
  overrides: Partial<ReferralMeDto> = {},
): ReferralMeDto => ({
  roles: [],
  ui_variant: 'NONE',
  user_type: 'REGULAR',
  status: 'ACTIVE',
  referral_code: null,
  referral_code_status: null,
  referred_by: null,
  earn_rates: {
    cashback_rate_bps: null,
    cashback_earning_start: null,
    cashback_earning_end: null,
    revshare_rate_bps: null,
    revshare_earning_start: null,
    revshare_earning_end: null,
  },
  localized_text: {} as ReferralMeDto['localized_text'],
  invite_hero: null,
  excluded_regions: [],
  ...overrides,
});

const arrangeGates = ({
  isBasicFunctionalityEnabled = true,
  isRewardsMoneyEnabled = true,
}: {
  isBasicFunctionalityEnabled?: boolean;
  isRewardsMoneyEnabled?: boolean;
} = {}) => {
  jest
    .spyOn(SettingsSelectors, 'selectBasicFunctionalityEnabled')
    .mockReturnValue(isBasicFunctionalityEnabled);
  jest
    .spyOn(RewardsMoneyFlagSelectors, 'selectRewardsMoneyControllerEnabled')
    .mockReturnValue(isRewardsMoneyEnabled);
};

const renderInvite = ({
  pendingReferralCode = 'KOL1',
  referralMe = buildReferralMe(),
  geoLocation = null,
}: {
  pendingReferralCode?: string | null;
  referralMe?: ReferralMeDto | null;
  geoLocation?: string | null;
} = {}) => {
  const referralMeEntries: Record<string, ReferralMeEntry> = referralMe
    ? { [PROFILE_ID]: { loading: false, error: false, data: referralMe } }
    : {};
  const store = configureStore({
    rewardsMoney: { referralMe: referralMeEntries, pendingReferralCode },
    rewards: { geoLocation },
  });
  const view = render(
    <Provider store={store}>
      <PendingMoneyReferralInvite />
    </Provider>,
  );
  return { ...view, store };
};

describe('PendingMoneyReferralInvite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    arrangeGates();
    mockGetCurrentRoute.mockReturnValue({ name: Routes.WALLET_VIEW });
    mockFetchReferralMe.mockResolvedValue({
      status: 'settled',
      profileId: PROFILE_ID,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does nothing when no deeplink left a code', () => {
    renderInvite({ pendingReferralCode: null });

    expect(useGeoRewardsMetadata).not.toHaveBeenCalled();
    expect(mockFetchReferralMe).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('opens the invite sheet with the code for an eligible user', async () => {
    const { store } = renderInvite();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_MONEY_INVITE_SHEET,
        { referralCode: 'KOL1' },
      );
    });
    expect(useGeoRewardsMetadata).toHaveBeenCalledWith({ enabled: true });
    expect(mockFetchReferralMe).toHaveBeenCalledWith({ forceFresh: true });
    expect(store.getState().rewardsMoney.pendingReferralCode).toBe('KOL1');
  });

  it('drops the code without a read when basic functionality is off', () => {
    arrangeGates({ isBasicFunctionalityEnabled: false });

    const { store } = renderInvite();

    expect(store.getState().rewardsMoney.pendingReferralCode).toBeNull();
    expect(mockFetchReferralMe).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('drops the code without a read when Rewards Money is disabled', () => {
    arrangeGates({ isRewardsMoneyEnabled: false });

    const { store } = renderInvite();

    expect(store.getState().rewardsMoney.pendingReferralCode).toBeNull();
    expect(mockFetchReferralMe).not.toHaveBeenCalled();
  });

  it.each([
    ['already a referrer', buildReferralMe({ roles: ['REFERRER'] })],
    ['already a referee', buildReferralMe({ roles: ['REFEREE'] })],
  ])('drops the code when the user is %s', async (_label, referralMe) => {
    const { store } = renderInvite({ referralMe });

    await waitFor(() => {
      expect(store.getState().rewardsMoney.pendingReferralCode).toBeNull();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('drops the code when the device is in an excluded region', async () => {
    const { store } = renderInvite({
      referralMe: buildReferralMe({ excluded_regions: ['GB'] }),
      geoLocation: 'GB',
    });

    await waitFor(() => {
      expect(store.getState().rewardsMoney.pendingReferralCode).toBeNull();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('drops the code when the read was discarded', async () => {
    mockFetchReferralMe.mockResolvedValue({
      status: 'discarded',
      profileId: PROFILE_ID,
    });

    const { store } = renderInvite();

    await waitFor(() => {
      expect(store.getState().rewardsMoney.pendingReferralCode).toBeNull();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('drops the code when the read failed', async () => {
    mockFetchReferralMe.mockRejectedValue(new Error('network'));

    const { store } = renderInvite();

    await waitFor(() => {
      expect(store.getState().rewardsMoney.pendingReferralCode).toBeNull();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('drops the code when the read settled without data', async () => {
    const { store } = renderInvite({ referralMe: null });

    await waitFor(() => {
      expect(store.getState().rewardsMoney.pendingReferralCode).toBeNull();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not open a second sheet when the invite is already showing', async () => {
    mockGetCurrentRoute.mockReturnValue({
      name: Routes.MODAL.REWARDS_MONEY_INVITE_SHEET,
    });

    const { store } = renderInvite();

    await waitFor(() => {
      expect(mockFetchReferralMe).toHaveBeenCalled();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(store.getState().rewardsMoney.pendingReferralCode).toBe('KOL1');
  });

  it('offers a newer code that replaces the pending one', async () => {
    const { store } = renderInvite();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      store.dispatch(setPendingReferralCode('KOL2'));
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenLastCalledWith(
        Routes.MODAL.REWARDS_MONEY_INVITE_SHEET,
        { referralCode: 'KOL2' },
      );
    });
  });

  it('cancels the pending read on unmount', () => {
    const { unmount } = renderInvite();

    unmount();

    expect(mockCancelInteractions).toHaveBeenCalled();
  });
});
