import userReducer, { userInitialState } from './index';
import {
  UserActionType,
  type SetTokenOverviewChartTypeAction,
  type SetTokenOverviewChartIntervalAction,
  type SetTokenIndicatorsAction,
  type SetMoneyOnboardingSeenAction,
  type SetMoneyEarnBannerDismissedAction,
  type SetOnboardingStepperStepAction,
} from '../../actions/user/types';
import { ChartType } from '../../components/UI/Charts/AdvancedChart/AdvancedChart.types';
import { DEFAULT_TOKEN_OVERVIEW_CHART_INTERVAL } from '../../components/UI/AssetOverview/Price/tokenOverviewChart.constants';

describe('user reducer', () => {
  describe('initial state', () => {
    it('has ChartType.Line as default tokenOverviewChartType', () => {
      expect(userInitialState.tokenOverviewChartType).toBe(ChartType.Line);
    });

    it('has moneyOnboardingSeen as false', () => {
      expect(userInitialState.moneyOnboardingSeen).toBe(false);
    });

    it('has onboardingStepperProgress as empty object', () => {
      expect(userInitialState.onboardingStepperProgress).toEqual({});
    });

    it('has moneyEarnBannerDismissedTokens as empty object', () => {
      expect(userInitialState.moneyEarnBannerDismissedTokens).toEqual({});
    });

    it('has tokenIndicators as empty array', () => {
      expect(userInitialState.tokenIndicators).toEqual([]);
    });

    it('has default tokenOverviewChartInterval', () => {
      expect(userInitialState.tokenOverviewChartInterval).toBe(
        DEFAULT_TOKEN_OVERVIEW_CHART_INTERVAL,
      );
    });
  });

  describe('SET_MONEY_ONBOARDING_SEEN', () => {
    it('sets moneyOnboardingSeen to true', () => {
      const action: SetMoneyOnboardingSeenAction = {
        type: UserActionType.SET_MONEY_ONBOARDING_SEEN,
        payload: { seen: true },
      };

      const newState = userReducer(userInitialState, action);

      expect(newState.moneyOnboardingSeen).toBe(true);
    });

    it('sets moneyOnboardingSeen back to false', () => {
      const currentState = {
        ...userInitialState,
        moneyOnboardingSeen: true,
      };
      const action: SetMoneyOnboardingSeenAction = {
        type: UserActionType.SET_MONEY_ONBOARDING_SEEN,
        payload: { seen: false },
      };

      const newState = userReducer(currentState, action);

      expect(newState.moneyOnboardingSeen).toBe(false);
    });

    it('does not modify other state properties', () => {
      const currentState = {
        ...userInitialState,
        userLoggedIn: true,
      };
      const action: SetMoneyOnboardingSeenAction = {
        type: UserActionType.SET_MONEY_ONBOARDING_SEEN,
        payload: { seen: true },
      };

      const newState = userReducer(currentState, action);

      expect(newState.moneyOnboardingSeen).toBe(true);
      expect(newState.userLoggedIn).toBe(true);
    });
  });

  describe('SET_MONEY_EARN_BANNER_DISMISSED', () => {
    it('sets the dismissed key to true', () => {
      const action: SetMoneyEarnBannerDismissedAction = {
        type: UserActionType.SET_MONEY_EARN_BANNER_DISMISSED,
        payload: { key: '0x1-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' },
      };

      const newState = userReducer(userInitialState, action);

      expect(newState.moneyEarnBannerDismissedTokens).toEqual({
        '0x1-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': true,
      });
    });

    it('merges a new key without overwriting existing ones', () => {
      const currentState = {
        ...userInitialState,
        moneyEarnBannerDismissedTokens: {
          '0x1-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': true,
        },
      };
      const action: SetMoneyEarnBannerDismissedAction = {
        type: UserActionType.SET_MONEY_EARN_BANNER_DISMISSED,
        payload: { key: '0xe708-0xdac17f958d2ee523a2206206994597c13d831ec7' },
      };

      const newState = userReducer(currentState, action);

      expect(newState.moneyEarnBannerDismissedTokens).toEqual({
        '0x1-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': true,
        '0xe708-0xdac17f958d2ee523a2206206994597c13d831ec7': true,
      });
    });

    it('does not modify other state properties', () => {
      const currentState = {
        ...userInitialState,
        userLoggedIn: true,
      };
      const action: SetMoneyEarnBannerDismissedAction = {
        type: UserActionType.SET_MONEY_EARN_BANNER_DISMISSED,
        payload: { key: '0x1-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' },
      };

      const newState = userReducer(currentState, action);

      expect(newState.userLoggedIn).toBe(true);
      expect(newState.moneyEarnBannerDismissedTokens).toEqual({
        '0x1-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': true,
      });
    });
  });

  describe('SET_ONBOARDING_STEPPER_STEP', () => {
    it('sets step for a new stepperId', () => {
      const action: SetOnboardingStepperStepAction = {
        type: UserActionType.SET_ONBOARDING_STEPPER_STEP,
        payload: { stepperId: 'money', step: 1 },
      };

      const newState = userReducer(userInitialState, action);

      expect(newState.onboardingStepperProgress).toEqual({ money: 1 });
    });

    it('updates step for an existing stepperId', () => {
      const currentState = {
        ...userInitialState,
        onboardingStepperProgress: { money: 0 },
      };
      const action: SetOnboardingStepperStepAction = {
        type: UserActionType.SET_ONBOARDING_STEPPER_STEP,
        payload: { stepperId: 'money', step: 2 },
      };

      const newState = userReducer(currentState, action);

      expect(newState.onboardingStepperProgress.money).toBe(2);
    });

    it('merges a new stepperId without overwriting existing ones', () => {
      const currentState = {
        ...userInitialState,
        onboardingStepperProgress: { money: 1 },
      };
      const action: SetOnboardingStepperStepAction = {
        type: UserActionType.SET_ONBOARDING_STEPPER_STEP,
        payload: { stepperId: 'earn', step: 3 },
      };

      const newState = userReducer(currentState, action);

      expect(newState.onboardingStepperProgress).toEqual({ money: 1, earn: 3 });
    });

    it('does not modify other state properties', () => {
      const currentState = {
        ...userInitialState,
        userLoggedIn: true,
      };
      const action: SetOnboardingStepperStepAction = {
        type: UserActionType.SET_ONBOARDING_STEPPER_STEP,
        payload: { stepperId: 'money', step: 1 },
      };

      const newState = userReducer(currentState, action);

      expect(newState.userLoggedIn).toBe(true);
      expect(newState.onboardingStepperProgress.money).toBe(1);
    });
  });

  describe('SET_TOKEN_OVERVIEW_CHART_TYPE', () => {
    it('updates tokenOverviewChartType to Candles', () => {
      const action: SetTokenOverviewChartTypeAction = {
        type: UserActionType.SET_TOKEN_OVERVIEW_CHART_TYPE,
        payload: { chartType: ChartType.Candles },
      };

      const newState = userReducer(userInitialState, action);

      expect(newState.tokenOverviewChartType).toBe(ChartType.Candles);
    });

    it('updates tokenOverviewChartType to Line', () => {
      const currentState = {
        ...userInitialState,
        tokenOverviewChartType: ChartType.Candles,
      };

      const action: SetTokenOverviewChartTypeAction = {
        type: UserActionType.SET_TOKEN_OVERVIEW_CHART_TYPE,
        payload: { chartType: ChartType.Line },
      };

      const newState = userReducer(currentState, action);

      expect(newState.tokenOverviewChartType).toBe(ChartType.Line);
    });

    it('does not modify other state properties', () => {
      const currentState = {
        ...userInitialState,
        userLoggedIn: true,
        seedphraseBackedUp: true,
        tokenOverviewChartType: ChartType.Line,
      };

      const action: SetTokenOverviewChartTypeAction = {
        type: UserActionType.SET_TOKEN_OVERVIEW_CHART_TYPE,
        payload: { chartType: ChartType.Candles },
      };

      const newState = userReducer(currentState, action);

      expect(newState.userLoggedIn).toBe(true);
      expect(newState.seedphraseBackedUp).toBe(true);
      expect(newState.tokenOverviewChartType).toBe(ChartType.Candles);
    });
  });

  describe('SET_TOKEN_OVERVIEW_CHART_INTERVAL', () => {
    it('updates tokenOverviewChartInterval', () => {
      const action: SetTokenOverviewChartIntervalAction = {
        type: UserActionType.SET_TOKEN_OVERVIEW_CHART_INTERVAL,
        payload: { interval: '1h' },
      };

      const newState = userReducer(userInitialState, action);

      expect(newState.tokenOverviewChartInterval).toBe('1h');
    });
  });

  describe('SET_TOKEN_INDICATORS', () => {
    it('sets tokenIndicators from empty to active indicators', () => {
      const action: SetTokenIndicatorsAction = {
        type: UserActionType.SET_TOKEN_INDICATORS,
        payload: { indicators: ['RSI', 'MACD'] },
      };

      const newState = userReducer(userInitialState, action);

      expect(newState.tokenIndicators).toEqual(['RSI', 'MACD']);
    });

    it('replaces existing tokenIndicators', () => {
      const currentState = {
        ...userInitialState,
        tokenIndicators: ['RSI', 'MA5'],
      };
      const action: SetTokenIndicatorsAction = {
        type: UserActionType.SET_TOKEN_INDICATORS,
        payload: { indicators: ['MACD'] },
      };

      const newState = userReducer(currentState, action);

      expect(newState.tokenIndicators).toEqual(['MACD']);
    });

    it('clears tokenIndicators when payload is empty', () => {
      const currentState = {
        ...userInitialState,
        tokenIndicators: ['RSI'],
      };
      const action: SetTokenIndicatorsAction = {
        type: UserActionType.SET_TOKEN_INDICATORS,
        payload: { indicators: [] },
      };

      const newState = userReducer(currentState, action);

      expect(newState.tokenIndicators).toEqual([]);
    });

    it('does not modify other state properties', () => {
      const currentState = {
        ...userInitialState,
        userLoggedIn: true,
        tokenOverviewChartType: ChartType.Candles,
        tokenIndicators: ['RSI'],
      };
      const action: SetTokenIndicatorsAction = {
        type: UserActionType.SET_TOKEN_INDICATORS,
        payload: { indicators: ['MACD', 'MA20'] },
      };

      const newState = userReducer(currentState, action);

      expect(newState.tokenIndicators).toEqual(['MACD', 'MA20']);
      expect(newState.userLoggedIn).toBe(true);
      expect(newState.tokenOverviewChartType).toBe(ChartType.Candles);
    });
  });
});
