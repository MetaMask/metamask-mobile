import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setTokenIndicators,
  setTokenOverviewChartInterval,
  setTokenOverviewChartType,
} from '../../../../../actions/user';
import { ChartType } from '../../../Charts/AdvancedChart/AdvancedChart.types';
import { selectTokenDetailsTechnicalIndicatorsEnabled } from '../../../../../selectors/featureFlagController/tokenDetailsTechnicalIndicators';
import {
  selectTokenIndicators,
  selectTokenOverviewChartInterval,
  selectTokenOverviewChartType,
} from '../../../../../reducers/user/selectors';
import { isTokenOverviewChartInterval } from '../tokenOverviewChart.constants';

export function useTokenChartPreferences() {
  const dispatch = useDispatch();
  const isTechnicalIndicatorsEnabled = useSelector(
    selectTokenDetailsTechnicalIndicatorsEnabled,
  );
  const chartType = useSelector(selectTokenOverviewChartType);
  const chartInterval = useSelector(selectTokenOverviewChartInterval);
  const indicators = useSelector(selectTokenIndicators);

  const setChartType = useCallback(
    (next: ChartType) => {
      dispatch(setTokenOverviewChartType(next));
    },
    [dispatch],
  );

  const setChartInterval = useCallback(
    (interval: string) => {
      const normalisedInterval = interval.toLowerCase();
      if (
        isTechnicalIndicatorsEnabled &&
        isTokenOverviewChartInterval(normalisedInterval)
      ) {
        dispatch(setTokenOverviewChartInterval(normalisedInterval));
      }
    },
    [dispatch, isTechnicalIndicatorsEnabled],
  );

  const setIndicators = useCallback(
    (next: string[]) => {
      dispatch(setTokenIndicators(next));
    },
    [dispatch],
  );

  return {
    chartType,
    chartInterval,
    indicators,
    setChartType,
    setChartInterval,
    setIndicators,
  };
}
