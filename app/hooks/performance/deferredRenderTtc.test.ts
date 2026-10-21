import { getPerformanceTimestamp } from '../../util/trace';
import {
  DeferredRenderPoint,
  DeferredRenderScreenIds,
  deferredRenderProbeId,
} from './deferredRenderPerformanceIds';
import {
  _resetDeferredRenderTtcForTesting,
  markDeferredRenderNavStart,
  markDeferredRenderPoint,
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
});
