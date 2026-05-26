/* eslint-disable @metamask/design-tokens/color-no-hex */

import { setState, resetState, getState } from './state';

jest.mock('./bridge', () => ({
  sendToReactNative: jest.fn(),
}));

import { handleSetChartType } from './chartType';

const mockTheme = {
  backgroundColor: '#131416',
  borderColor: '#333',
  textColor: '#fff',
  successColor: '#0C9F76',
  errorColor: '#E06470',
  primaryColor: '#4A90D9',
};

beforeEach(() => {
  resetState();
});

describe('handleSetChartType', () => {
  it('sets currentChartType when widget exists', () => {
    setState({
      chartWidget: {
        activeChart: () => ({
          setChartType: jest.fn(),
          getSeries: () => ({ setChartStyleProperties: jest.fn() }),
        }),
      },
      isChartReady: false,
      currentChartType: 2,
      CONFIG: { theme: mockTheme, libraryUrl: '' },
      ohlcvData: [],
      __mmSuppressChartInteractUntil: 0,
    });

    handleSetChartType({ type: 1 });

    expect(getState().currentChartType).toBe(1);
  });

  it('returns early when isChartReady is false', () => {
    const setChartType = jest.fn();
    setState({
      chartWidget: {
        activeChart: () => ({
          setChartType,
          getSeries: () => ({ setChartStyleProperties: jest.fn() }),
        }),
      },
      isChartReady: false,
      currentChartType: 2,
      CONFIG: { theme: mockTheme, libraryUrl: '' },
      ohlcvData: [],
      __mmSuppressChartInteractUntil: 0,
    });

    handleSetChartType({ type: 1 });
    expect(setChartType).not.toHaveBeenCalled();
  });

  it('returns early without setting type when chartWidget is null', () => {
    setState({
      chartWidget: null,
      isChartReady: false,
      currentChartType: 2,
      CONFIG: { theme: mockTheme, libraryUrl: '' },
      ohlcvData: [],
      __mmSuppressChartInteractUntil: 0,
    });

    expect(() => handleSetChartType({ type: 1 })).not.toThrow();
    expect(getState().currentChartType).toBe(2);
  });
});
