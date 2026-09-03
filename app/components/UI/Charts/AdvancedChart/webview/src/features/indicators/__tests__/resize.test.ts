/**
 * @jest-environment jsdom
 */
import { scheduleChartWidgetResize } from '../resize';
import { __resetStateForTests, setWidget } from '../../../core/state';
import type { TVChartingLibraryWidget } from '../../../core/types';

describe('features/indicators/resize', () => {
  beforeEach(() => {
    __resetStateForTests();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls widget.resize() via double-rAF', () => {
    const resize = jest.fn();
    setWidget({ resize } as unknown as TVChartingLibraryWidget);

    scheduleChartWidgetResize();

    jest.runAllTimers();
    expect(resize).toHaveBeenCalled();
  });

  it('does not throw when widget is null', () => {
    expect(() => {
      scheduleChartWidgetResize();
      jest.runAllTimers();
    }).not.toThrow();
  });

  it('swallows errors from widget.resize()', () => {
    setWidget({
      resize: () => {
        throw new Error('teardown');
      },
    } as unknown as TVChartingLibraryWidget);

    expect(() => {
      scheduleChartWidgetResize();
      jest.runAllTimers();
    }).not.toThrow();
  });

  it('falls back to setTimeout when requestAnimationFrame throws', () => {
    const resize = jest.fn();
    setWidget({ resize } as unknown as TVChartingLibraryWidget);

    const originalRAF = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = () => {
      throw new Error('rAF unavailable');
    };

    try {
      scheduleChartWidgetResize();
      jest.runAllTimers();
      expect(resize).toHaveBeenCalled();
    } finally {
      globalThis.requestAnimationFrame = originalRAF;
    }
  });
});
