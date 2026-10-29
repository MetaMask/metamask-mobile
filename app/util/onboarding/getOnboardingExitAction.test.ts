import Routes from '../../constants/navigation/Routes';
import { ONBOARDING_SUCCESS_FLOW } from '../../constants/onboarding';
import type { RootState } from '../../reducers';
import { clearPendingReferralCode } from '../../reducers/rewardsMoney';
import { selectRewardsMoneyControllerEnabled } from '../../selectors/featureFlagController/rewardsMoneyController';
import { selectBasicFunctionalityEnabled } from '../../selectors/settings';
import {
  getOnboardingExitAction,
  resetToHomeAction,
} from './getOnboardingExitAction';

jest.mock(
  '../../selectors/featureFlagController/rewardsMoneyController',
  () => ({
    selectRewardsMoneyControllerEnabled: jest.fn(),
  }),
);
jest.mock('../../selectors/settings', () => ({
  selectBasicFunctionalityEnabled: jest.fn(),
}));

const mockSelectMoneyEnabled = jest.mocked(selectRewardsMoneyControllerEnabled);
const mockSelectBasicFunctionality = jest.mocked(
  selectBasicFunctionalityEnabled,
);

const REFERRAL_CODE = 'KOL123';

const buildState = (pendingReferralCode: string | null) =>
  ({
    rewardsMoney: { pendingReferralCode, answeredReferralCode: null },
  }) as unknown as RootState;

const homeReset = {
  type: 'RESET',
  payload: { index: 0, routes: [{ name: Routes.ONBOARDING.HOME_NAV }] },
};

describe('getOnboardingExitAction', () => {
  const dispatch = jest.fn();

  beforeEach(() => {
    mockSelectBasicFunctionality.mockReturnValue(true);
    mockSelectMoneyEnabled.mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ONBOARDING_SUCCESS_FLOW.BACKED_UP_SRP,
    ONBOARDING_SUCCESS_FLOW.NO_BACKED_UP_SRP,
    ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE,
    ONBOARDING_SUCCESS_FLOW.SEEDLESS_ONBOARDING,
  ])('routes first-time flow %s with a pending code to the step', (flow) => {
    const action = getOnboardingExitAction({
      state: buildState(REFERRAL_CODE),
      successFlow: flow,
      dispatch,
    });

    expect(action).toEqual({
      type: 'RESET',
      payload: {
        index: 0,
        routes: [
          {
            name: Routes.ONBOARDING.MONEY_REFERRAL,
            params: { referralCode: REFERRAL_CODE },
          },
        ],
      },
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('goes Home when no code is pending', () => {
    const action = getOnboardingExitAction({
      state: buildState(null),
      successFlow: ONBOARDING_SUCCESS_FLOW.BACKED_UP_SRP,
      dispatch,
    });

    expect(action).toEqual(homeReset);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it.each([
    ONBOARDING_SUCCESS_FLOW.SETTINGS_BACKUP,
    ONBOARDING_SUCCESS_FLOW.REMINDER_BACKUP,
    undefined,
  ])('leaves the code for the Home invite after flow %s', (flow) => {
    const action = getOnboardingExitAction({
      state: buildState(REFERRAL_CODE),
      successFlow: flow,
      dispatch,
    });

    expect(action).toEqual(homeReset);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('drops the code and goes Home when Basic Functionality is off', () => {
    mockSelectBasicFunctionality.mockReturnValue(false);

    const action = getOnboardingExitAction({
      state: buildState(REFERRAL_CODE),
      successFlow: ONBOARDING_SUCCESS_FLOW.BACKED_UP_SRP,
      dispatch,
    });

    expect(action).toEqual(homeReset);
    expect(dispatch).toHaveBeenCalledWith(clearPendingReferralCode());
  });

  it('drops the code and goes Home when Money is disabled', () => {
    mockSelectMoneyEnabled.mockReturnValue(false);

    const action = getOnboardingExitAction({
      state: buildState(REFERRAL_CODE),
      successFlow: ONBOARDING_SUCCESS_FLOW.SEEDLESS_ONBOARDING,
      dispatch,
    });

    expect(action).toEqual(homeReset);
    expect(dispatch).toHaveBeenCalledWith(clearPendingReferralCode());
  });

  it('builds the Home reset', () => {
    expect(resetToHomeAction()).toEqual(homeReset);
  });
});
