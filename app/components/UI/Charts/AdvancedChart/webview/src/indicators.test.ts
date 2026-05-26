import {
  isOwnStringKey,
  resolveIndicatorPreset,
  handleAddIndicator,
  handleRemoveIndicator,
} from './indicators';

import { setState, resetState, type ChartState } from './state';

afterEach(() => resetState());

describe('isOwnStringKey', () => {
  it('accepts normal strings', () => {
    expect(isOwnStringKey('MACD')).toBe(true);
    expect(isOwnStringKey('RSI')).toBe(true);
  });

  it('rejects prototype pollution keys', () => {
    expect(isOwnStringKey('__proto__')).toBe(false);
    expect(isOwnStringKey('constructor')).toBe(false);
    expect(isOwnStringKey('prototype')).toBe(false);
  });

  it('rejects non-strings', () => {
    expect(isOwnStringKey(42)).toBe(false);
    expect(isOwnStringKey(null)).toBe(false);
    expect(isOwnStringKey(undefined)).toBe(false);
  });
});

describe('resolveIndicatorPreset', () => {
  it('resolves MACD preset', () => {
    const result = resolveIndicatorPreset('MACD');
    expect(result.studyName).toBe('MACD');
    expect(result.inputs).toEqual({ in_0: 12, in_1: 26, in_2: 9 });
  });

  it('resolves RSI preset', () => {
    const result = resolveIndicatorPreset('RSI');
    expect(result.studyName).toBe('Relative Strength Index');
    expect(result.inputs).toEqual({ in_0: 14 });
  });

  it('resolves MA200 preset', () => {
    const result = resolveIndicatorPreset('MA200');
    expect(result.studyName).toBe('Moving Average');
    expect(result.inputs).toEqual({ in_0: 200 });
  });

  it('passes through unknown indicator names', () => {
    const result = resolveIndicatorPreset('Bollinger Bands', { in_0: 20 });
    expect(result.studyName).toBe('Bollinger Bands');
    expect(result.inputs).toEqual({ in_0: 20 });
  });
});

describe('handleAddIndicator', () => {
  it('no-ops when chart is not ready', () => {
    setState({
      chartWidget: null,
      isChartReady: false,
      activeStudies: new Map(),
    } as Partial<ChartState>);
    handleAddIndicator({ name: 'MACD' });
    expect(true).toBe(true); // no throw
  });

  it('no-ops if indicator already active', () => {
    const studies = new Map([['MACD', 'study-123']]);
    const createStudy = jest.fn();
    setState({
      chartWidget: { activeChart: () => ({ createStudy }) },
      isChartReady: true,
      activeStudies: studies,
    } as Partial<ChartState>);
    handleAddIndicator({ name: 'MACD' });
    expect(createStudy).not.toHaveBeenCalled();
  });
});

describe('handleRemoveIndicator', () => {
  it('removes an existing indicator', () => {
    const removeEntity = jest.fn();
    const studies = new Map([['RSI', 'study-456']]);
    setState({
      chartWidget: { activeChart: () => ({ removeEntity }) },
      isChartReady: true,
      activeStudies: studies,
      ReactNativeWebView: { postMessage: jest.fn() },
    } as Partial<ChartState>);
    handleRemoveIndicator({ name: 'RSI' });
    expect(removeEntity).toHaveBeenCalledWith('study-456');
    expect(studies.has('RSI')).toBe(false);
  });

  it('no-ops for unknown indicator', () => {
    const removeEntity = jest.fn();
    setState({
      chartWidget: { activeChart: () => ({ removeEntity }) },
      isChartReady: true,
      activeStudies: new Map(),
    } as Partial<ChartState>);
    handleRemoveIndicator({ name: 'MACD' });
    expect(removeEntity).not.toHaveBeenCalled();
  });
});
