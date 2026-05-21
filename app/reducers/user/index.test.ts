import userReducer, { userInitialState } from './index';
import {
  UserActionType,
  type SetTokenOverviewChartTypeAction,
  type SetMoneyOnboardingSeenAction,
} from '../../actions/user/types';
import { ChartType } from '../../components/UI/Charts/AdvancedChart/AdvancedChart.types';

describe('user reducer', () => {
  describe('initial state', () => {
    it('has ChartType.Line as default tokenOverviewChartType', () => {
      expect(userInitialState.tokenOverviewChartType).toBe(ChartType.Line);
    });

    it('has moneyOnboardingSeen as false', () => {
      expect(userInitialState.moneyOnboardingSeen).toBe(false);
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
});
