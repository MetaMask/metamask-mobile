/**
 * @jest-environment jsdom
 */
import { handleSetChartType } from '../chartType';
import {
  __resetStateForTests,
  getCurrentChartType,
  setChartReady,
  setWidget,
} from '../../core/state';
import type { TVChartingLibraryWidget } from '../../core/types';

describe('handleSetChartType', () => {
  beforeEach(() => {
    __resetStateForTests();
    delete (window as unknown as { ReactNativeWebView?: unknown })
      .ReactNativeWebView;
  });

  it('persists the type when no widget exists yet', () => {
    handleSetChartType({ type: 1 });
    expect(getCurrentChartType()).toBe(1);
  });

  it('updates state but skips the widget call when chart is not ready', () => {
    const setChartType = jest.fn();
    setWidget({
      activeChart: () => ({ setChartType }) as never,
    } as unknown as TVChartingLibraryWidget);
    handleSetChartType({ type: 2 });
    expect(getCurrentChartType()).toBe(2);
    expect(setChartType).not.toHaveBeenCalled();
  });

  it('calls setChartType on the active chart when ready', () => {
    const setChartType = jest.fn();
    setWidget({
      activeChart: () => ({ setChartType }) as never,
    } as unknown as TVChartingLibraryWidget);
    setChartReady(true);
    handleSetChartType({ type: 1 });
    expect(setChartType).toHaveBeenCalledWith(1);
    expect(getCurrentChartType()).toBe(1);
  });

  it('forwards setChartType failures to the ERROR channel', () => {
    const bridge = { postMessage: jest.fn() };
    (
      window as unknown as { ReactNativeWebView: typeof bridge }
    ).ReactNativeWebView = bridge;
    setWidget({
      activeChart: () =>
        ({
          setChartType: () => {
            throw new Error('boom');
          },
        }) as never,
    } as unknown as TVChartingLibraryWidget);
    setChartReady(true);
    handleSetChartType({ type: 1 });
    expect(bridge.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('"message":"boom"'),
    );
  });
});
