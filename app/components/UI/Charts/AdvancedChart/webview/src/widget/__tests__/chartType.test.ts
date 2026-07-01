/**
 * @jest-environment jsdom
 */
import { handleSetChartType } from '../chartType';
import {
  __resetStateForTests,
  getCurrentChartType,
  setChartReady,
  setTheme,
  setWidget,
} from '../../core/state';
import type { ChartTheme, TVChartingLibraryWidget } from '../../core/types';

interface ChartMock {
  setChartType: jest.Mock;
  getSeries: jest.Mock;
  detachToRight: jest.Mock;
}

interface WidgetMock {
  widget: TVChartingLibraryWidget;
  chart: ChartMock;
  applyOverrides: jest.Mock;
  subscribe: jest.Mock;
}

const baseTheme: ChartTheme = {
  backgroundColor: 'rgb(0,0,0)',
  borderColor: 'rgb(17,17,17)',
  textColor: 'rgb(255,255,255)',
  textDefaultColor: 'rgb(255,255,255)',
  sectionBackgroundColor: 'rgb(34,34,34)',
  crosshairBackgroundColor: 'rgb(51,51,51)',
  crosshairTextColor: 'rgb(238,238,238)',
  legendTextColor: 'rgb(170,170,170)',
  textAlternativeColor: 'rgb(187,187,187)',
  successColor: 'rgb(0,255,0)',
  lineColor: 'rgb(171,205,239)',
  errorColor: 'rgb(255,0,0)',
  primaryColor: 'rgb(0,51,255)',
  currentPriceColor: 'rgb(34,34,0)',
};

const makeWidget = (chartImpl: Partial<ChartMock> = {}): WidgetMock => {
  const chart: ChartMock = {
    setChartType: chartImpl.setChartType ?? jest.fn(),
    detachToRight: chartImpl.detachToRight ?? jest.fn(),
    getSeries: jest.fn(),
  };
  chart.getSeries.mockReturnValue({ detachToRight: chart.detachToRight });
  const applyOverrides = jest.fn();
  const subscribe = jest.fn();
  const widget = {
    activeChart: () => chart as unknown,
    applyOverrides,
    subscribe,
  } as unknown as TVChartingLibraryWidget;
  return { widget, chart, applyOverrides, subscribe };
};

describe('handleSetChartType', () => {
  beforeEach(() => {
    __resetStateForTests();
    setTheme(baseTheme);
    delete (window as unknown as { ReactNativeWebView?: unknown })
      .ReactNativeWebView;
  });

  it('persists the type when no widget exists yet', () => {
    handleSetChartType({ type: 1 });
    expect(getCurrentChartType()).toBe(1);
  });

  it('updates state but skips the widget call when chart is not ready', () => {
    const { widget, chart } = makeWidget();
    setWidget(widget);
    handleSetChartType({ type: 2 });
    expect(getCurrentChartType()).toBe(2);
    expect(chart.setChartType).not.toHaveBeenCalled();
  });

  it('calls setChartType, applies scale layout, detaches main series', () => {
    const { widget, chart, applyOverrides } = makeWidget();
    setWidget(widget);
    setChartReady(true);
    handleSetChartType({ type: 1 });
    expect(chart.setChartType).toHaveBeenCalledWith(1);
    expect(applyOverrides).toHaveBeenCalled();
    expect(applyOverrides.mock.calls[0][0]).toMatchObject({
      'paneProperties.topMargin': 12,
      'paneProperties.bottomMargin': 8,
      'scalesProperties.showRightScale': true,
    });
    expect(chart.detachToRight).toHaveBeenCalledTimes(1);
  });

  it('re-applies the scale layout on the next animation frame', () => {
    const rafSpy = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      });
    const { widget, chart, applyOverrides } = makeWidget();
    setWidget(widget);
    setChartReady(true);
    handleSetChartType({ type: 2 });
    expect(applyOverrides).toHaveBeenCalledTimes(2);
    expect(chart.detachToRight).toHaveBeenCalledTimes(2);
    rafSpy.mockRestore();
  });

  it('forwards setChartType failures to the ERROR channel', () => {
    const bridge = { postMessage: jest.fn() };
    (
      window as unknown as { ReactNativeWebView: typeof bridge }
    ).ReactNativeWebView = bridge;
    const { widget } = makeWidget({
      setChartType: jest.fn(() => {
        throw new Error('boom');
      }),
    });
    setWidget(widget);
    setChartReady(true);
    handleSetChartType({ type: 1 });
    expect(bridge.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('"message":"boom"'),
    );
  });
});
