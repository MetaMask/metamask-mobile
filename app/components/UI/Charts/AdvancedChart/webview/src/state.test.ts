import {
  getState,
  setState,
  resetState,
  suppressChartUserInteraction,
  bumpLineChartOhlcvEpoch,
  type ChartState,
} from './state';

afterEach(() => resetState());

describe('state', () => {
  it('returns the same object on repeated calls', () => {
    setState({ ohlcvData: [], lineChartOhlcvEpoch: 0 } as Partial<ChartState>);
    expect(getState()).toBe(getState());
  });

  it('setState replaces the state', () => {
    setState({ ohlcvData: [{ time: 1 }] } as Partial<ChartState>);
    expect(getState().ohlcvData).toHaveLength(1);
  });
});

describe('suppressChartUserInteraction', () => {
  it('sets __mmSuppressChartInteractUntil in the future', () => {
    setState({ __mmSuppressChartInteractUntil: 0 } as Partial<ChartState>);
    const before = Date.now();
    suppressChartUserInteraction(500);
    expect(getState().__mmSuppressChartInteractUntil).toBeGreaterThanOrEqual(
      before + 500,
    );
  });
});

describe('bumpLineChartOhlcvEpoch', () => {
  it('increments lineChartOhlcvEpoch', () => {
    setState({ lineChartOhlcvEpoch: 3 } as Partial<ChartState>);
    bumpLineChartOhlcvEpoch();
    expect(getState().lineChartOhlcvEpoch).toBe(4);
  });

  it('handles undefined epoch', () => {
    setState({ lineChartOhlcvEpoch: undefined } as Partial<ChartState>);
    bumpLineChartOhlcvEpoch();
    expect(getState().lineChartOhlcvEpoch).toBe(1);
  });
});
