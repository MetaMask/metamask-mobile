import userReducer, { userInitialState } from './index';
import {
  UserActionType,
  type SetTokenOverviewChartTypeAction,
} from '../../actions/user/types';
import { ChartType } from '../../components/UI/Charts/AdvancedChart/AdvancedChart.types';

describe('user reducer', () => {
  describe('initial state', () => {
    it('should have ChartType.Line as default tokenOverviewChartType', () => {
      expect(userInitialState.tokenOverviewChartType).toBe(ChartType.Line);
    });
  });

  describe('SET_TOKEN_OVERVIEW_CHART_TYPE', () => {
    it('should update tokenOverviewChartType to Candles', () => {
      const action: SetTokenOverviewChartTypeAction = {
        type: UserActionType.SET_TOKEN_OVERVIEW_CHART_TYPE,
        payload: { chartType: ChartType.Candles },
      };

      const newState = userReducer(userInitialState, action);

      expect(newState.tokenOverviewChartType).toBe(ChartType.Candles);
    });

    it('should update tokenOverviewChartType to Line', () => {
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

    it('should not modify other state properties', () => {
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
