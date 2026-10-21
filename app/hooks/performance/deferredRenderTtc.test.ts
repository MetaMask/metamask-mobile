import { getPerformanceTimestamp } from '../../util/trace';
import {
  DeferredRenderPoint,
  DeferredRenderScreenIds,
  deferredRenderProbeId,
  PERPS_MARKET_DETAILS_CHART_PATH_PROBE_ID,
  PERPS_MARKET_DETAILS_CHART_PIN_PROBE_ID,
} from './deferredRenderPerformanceIds';
import {
  _resetDeferredRenderTtcForTesting,
  markDeferredRenderChartReady,
  markDeferredRenderNavStart,
  markDeferredRenderPoint,
  markPerpsChartPinFailed,
  markPerpsChartRenderPath,
} from './deferredRenderTtc';
import {
  formatScreenTtcAccessibilityLabel,
  getAllScreenTtc,
  getScreenTtc,
  parseScreenTtcAccessibilityLabel,
  _resetScreenTtcRegistryForTesting,
  _setScreenTtcProbeEnabledForTesting,
} from './screenTtcRegistry';

jest.mock('../../util/test/utils', () => ({
  isE2EOrPerformanceTest: false,
}));

jest.mock('../../util/trace', () => ({
  getPerformanceTimestamp: jest.fn(),
}));

const mockNow = getPerformanceTimestamp as jest.MockedFunction<
  typeof getPerformanceTimestamp
>;

describe('deferredRenderTtc', () => {
  beforeEach(() => {
    _resetScreenTtcRegistryForTesting();
    _resetDeferredRenderTtcForTesting();
    _setScreenTtcProbeEnabledForTesting(true);
    mockNow.mockReset();
  });

  it('records nothing when the screen TTC probe is disabled', () => {
    _setScreenTtcProbeEnabledForTesting(false);
    mockNow.mockReturnValue(1_000);

    markDeferredRenderNavStart(DeferredRenderScreenIds.TOKEN_DETAILS);
    markDeferredRenderPoint(
      DeferredRenderScreenIds.TOKEN_DETAILS,
      DeferredRenderPoint.FIRST_RENDER,
    );

    expect(getAllScreenTtc()).toEqual([]);
  });

  it('records nav start, first render, chart data, and chart ready from one origin', () => {
    const screenId = DeferredRenderScreenIds.PERPS_MARKET_DETAILS;
    mockNow
      .mockReturnValueOnce(10_000)
      .mockReturnValueOnce(10_040)
      .mockReturnValueOnce(10_200)
      .mockReturnValueOnce(10_500);

    markDeferredRenderNavStart(screenId);
    markDeferredRenderPoint(screenId, DeferredRenderPoint.FIRST_RENDER);
    markDeferredRenderPoint(screenId, DeferredRenderPoint.CHART_DATA_READY);
    markDeferredRenderPoint(screenId, DeferredRenderPoint.CHART_READY);

    expect(
      getScreenTtc(
        deferredRenderProbeId(screenId, DeferredRenderPoint.NAV_START),
      )?.durationMs,
    ).toBe(0);
    expect(
      getScreenTtc(
        deferredRenderProbeId(screenId, DeferredRenderPoint.FIRST_RENDER),
      )?.durationMs,
    ).toBe(40);
    expect(
      getScreenTtc(
        deferredRenderProbeId(screenId, DeferredRenderPoint.CHART_DATA_READY),
      )?.durationMs,
    ).toBe(200);
    expect(
      getScreenTtc(
        deferredRenderProbeId(screenId, DeferredRenderPoint.CHART_READY),
      )?.durationMs,
    ).toBe(500);

    const navRecord = getScreenTtc(
      deferredRenderProbeId(screenId, DeferredRenderPoint.NAV_START),
    );
    expect(navRecord).toBeDefined();
    if (!navRecord) {
      throw new Error('expected nav start record');
    }
    const label = formatScreenTtcAccessibilityLabel(navRecord);
    expect(parseScreenTtcAccessibilityLabel(label)).toEqual({
      screenId: 'perps_market_details_nav_start',
      durationMs: 0,
      contentState: 'filled',
      generation: navRecord.generation,
    });
  });

  it('keeps the first duration for a point until the next nav start', () => {
    const screenId = DeferredRenderScreenIds.PREDICT_UPDOWN_DETAILS;
    const firstRenderId = deferredRenderProbeId(
      screenId,
      DeferredRenderPoint.FIRST_RENDER,
    );
    mockNow.mockReturnValueOnce(5_000).mockReturnValueOnce(5_100);

    markDeferredRenderNavStart(screenId);
    markDeferredRenderPoint(screenId, DeferredRenderPoint.FIRST_RENDER);
    const firstGeneration = getScreenTtc(firstRenderId)?.generation;

    markDeferredRenderPoint(screenId, DeferredRenderPoint.FIRST_RENDER);

    expect(getScreenTtc(firstRenderId)?.durationMs).toBe(100);
    expect(getScreenTtc(firstRenderId)?.generation).toBe(firstGeneration);
    expect(mockNow).toHaveBeenCalledTimes(2);

    mockNow.mockReturnValueOnce(20_000).mockReturnValueOnce(20_050);
    markDeferredRenderNavStart(screenId);
    markDeferredRenderPoint(screenId, DeferredRenderPoint.FIRST_RENDER);

    expect(getScreenTtc(firstRenderId)?.durationMs).toBe(50);
    expect(getScreenTtc(firstRenderId)?.generation).not.toBe(firstGeneration);
  });

  it('records an error chart data outcome instead of filled', () => {
    const screenId = DeferredRenderScreenIds.TOKEN_DETAILS;
    const chartDataId = deferredRenderProbeId(
      screenId,
      DeferredRenderPoint.CHART_DATA_READY,
    );
    mockNow.mockReturnValueOnce(1_000).mockReturnValueOnce(1_250);

    markDeferredRenderNavStart(screenId);
    markDeferredRenderPoint(
      screenId,
      DeferredRenderPoint.CHART_DATA_READY,
      'error',
    );

    const record = getScreenTtc(chartDataId);
    expect(record?.contentState).toBe('error');
    expect(record?.durationMs).toBe(250);
    if (!record) {
      throw new Error('expected chart data record');
    }
    expect(formatScreenTtcAccessibilityLabel(record)).toBe(
      `ttc:token_details_chart_data_ready:250:${record.generation}:error`,
    );
  });

  it('records chart_ready on the second animation frame', () => {
    const screenId = DeferredRenderScreenIds.TOKEN_DETAILS;
    const chartReadyId = deferredRenderProbeId(
      screenId,
      DeferredRenderPoint.CHART_READY,
    );
    const frames: FrameRequestCallback[] = [];
    const frameSpy = jest
      .spyOn(global, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        frames.push(callback);
        return frames.length;
      });
    mockNow.mockReturnValueOnce(10).mockReturnValueOnce(40);

    try {
      markDeferredRenderNavStart(screenId);
      markDeferredRenderChartReady(screenId);

      expect(getScreenTtc(chartReadyId)).toBeUndefined();
      frames[0]?.(0);
      expect(getScreenTtc(chartReadyId)).toBeUndefined();
      frames[1]?.(0);

      expect(getScreenTtc(chartReadyId)?.durationMs).toBe(30);
    } finally {
      frameSpy.mockRestore();
    }
  });

  it('snapshots the perps chart path when chart_ready is recorded', () => {
    const screenId = DeferredRenderScreenIds.PERPS_MARKET_DETAILS;
    const chartReadyId = deferredRenderProbeId(
      screenId,
      DeferredRenderPoint.CHART_READY,
    );
    const frames: FrameRequestCallback[] = [];
    const frameSpy = jest
      .spyOn(global, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        frames.push(callback);
        return frames.length;
      });
    mockNow.mockReturnValue(80);

    const flushReady = () => {
      const outer = frames.length - 1;
      frames[outer]?.(0);
      frames[outer + 1]?.(0);
    };

    try {
      markDeferredRenderNavStart(screenId);
      markPerpsChartRenderPath('advanced');
      markPerpsChartRenderPath('tradingview');
      expect(
        getScreenTtc(PERPS_MARKET_DETAILS_CHART_PATH_PROBE_ID),
      ).toBeUndefined();

      markDeferredRenderChartReady(screenId);
      flushReady();

      expect(
        getScreenTtc(PERPS_MARKET_DETAILS_CHART_PATH_PROBE_ID)?.chartPath,
      ).toBe('mixed');
      expect(getScreenTtc(chartReadyId)?.chartPath).toBe('mixed');

      markDeferredRenderNavStart(screenId);
      markPerpsChartRenderPath('advanced');
      markDeferredRenderChartReady(screenId);
      flushReady();

      const pathRecord = getScreenTtc(PERPS_MARKET_DETAILS_CHART_PATH_PROBE_ID);
      const readyRecord = getScreenTtc(chartReadyId);
      expect(pathRecord?.chartPath).toBe('advanced');
      expect(readyRecord?.chartPath).toBe('advanced');
      if (!pathRecord) {
        throw new Error('expected chart path snapshot');
      }
      expect(formatScreenTtcAccessibilityLabel(pathRecord)).toBe(
        `ttc:perps_market_details_chart_path:0:${pathRecord.generation}:advanced`,
      );
      expect(
        parseScreenTtcAccessibilityLabel(
          formatScreenTtcAccessibilityLabel(pathRecord),
        )?.chartPath,
      ).toBe('advanced');
    } finally {
      frameSpy.mockRestore();
    }
  });

  it('records a perps chart pin failure', () => {
    markPerpsChartPinFailed();

    const pinRecord = getScreenTtc(PERPS_MARKET_DETAILS_CHART_PIN_PROBE_ID);
    expect(pinRecord?.contentState).toBe('error');
    if (!pinRecord) {
      throw new Error('expected pin failure record');
    }
    expect(formatScreenTtcAccessibilityLabel(pinRecord)).toBe(
      `ttc:perps_market_details_chart_pin:0:${pinRecord.generation}:error`,
    );
  });
});
