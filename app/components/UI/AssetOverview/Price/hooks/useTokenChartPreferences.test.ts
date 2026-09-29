import { renderHook, act } from '@testing-library/react-hooks';
import { ChartType } from '../../../Charts/AdvancedChart/AdvancedChart.types';
import { useTokenChartPreferences } from './useTokenChartPreferences';
import { selectTokenDetailsTechnicalIndicatorsEnabled } from '../../../../../selectors/featureFlagController/tokenDetailsTechnicalIndicators';
import {
  selectTokenIndicators,
  selectTokenOverviewChartInterval,
  selectTokenOverviewChartType,
} from '../../../../../reducers/user/selectors';

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: jest.fn(),
}));

jest.mock(
  '../../../../../selectors/featureFlagController/tokenDetailsTechnicalIndicators',
  () => ({
    selectTokenDetailsTechnicalIndicatorsEnabled: jest.fn(),
  }),
);

jest.mock('../../../../../reducers/user/selectors', () => ({
  selectTokenOverviewChartType: jest.fn(),
  selectTokenOverviewChartInterval: jest.fn(),
  selectTokenIndicators: jest.fn(),
}));

const { useSelector } = jest.requireMock('react-redux');

const setupSelectorMocks = ({
  chartType = ChartType.Candles,
  chartInterval = '15m',
  indicators = ['RSI'],
  isTechnicalIndicatorsEnabled = false,
}: {
  chartType?: ChartType;
  chartInterval?: string;
  indicators?: string[];
  isTechnicalIndicatorsEnabled?: boolean;
} = {}) => {
  useSelector.mockImplementation((selector: unknown) => {
    if (selector === selectTokenOverviewChartType) return chartType;
    if (selector === selectTokenOverviewChartInterval) return chartInterval;
    if (selector === selectTokenIndicators) return indicators;
    if (selector === selectTokenDetailsTechnicalIndicatorsEnabled) {
      return isTechnicalIndicatorsEnabled;
    }
    return undefined;
  });
};

describe('useTokenChartPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupSelectorMocks();
  });

  it('returns persisted chart preferences from selectors', () => {
    const { result } = renderHook(() => useTokenChartPreferences());

    expect(result.current.chartType).toBe(ChartType.Candles);
    expect(result.current.chartInterval).toBe('15m');
    expect(result.current.indicators).toEqual(['RSI']);
  });

  it('dispatches setChartType', () => {
    const { result } = renderHook(() => useTokenChartPreferences());

    act(() => {
      result.current.setChartType(ChartType.Line);
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_TOKEN_OVERVIEW_CHART_TYPE',
      payload: { chartType: ChartType.Line },
    });
  });

  it('dispatches setIndicators', () => {
    const { result } = renderHook(() => useTokenChartPreferences());

    act(() => {
      result.current.setIndicators(['MACD', 'MA5']);
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_TOKEN_INDICATORS',
      payload: { indicators: ['MACD', 'MA5'] },
    });
  });

  it('does not persist interval when technical indicators flag is OFF', () => {
    const { result } = renderHook(() => useTokenChartPreferences());

    act(() => {
      result.current.setChartInterval('1h');
    });

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('persists interval when technical indicators flag is ON', () => {
    setupSelectorMocks({ isTechnicalIndicatorsEnabled: true });
    const { result } = renderHook(() => useTokenChartPreferences());

    act(() => {
      result.current.setChartInterval('1H');
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_TOKEN_OVERVIEW_CHART_INTERVAL',
      payload: { interval: '1h' },
    });
  });
});
