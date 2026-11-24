/**
 * @jest-environment jsdom
 */
import {
  __resetAvatarMarkerRefreshForTests,
  clearAvatarMarkers,
  handleSetAvatarMarkers,
} from '../index';
import { __resetAvatarMarkerStateForTests } from '../state';
import { AVATAR_SIZE } from '../grouping';
import {
  BASE_PANE_TOP_MARGIN,
  __resetPaneMarginsForTests,
} from '../../../widget/paneMargins';
import {
  __resetStateForTests,
  setChartReady,
  setOhlcvData,
  setTheme,
  setWidget,
} from '../../../core/state';
import type {
  ChartTheme,
  OHLCVBar,
  TVActiveChart,
  TVChartingLibraryWidget,
} from '../../../core/types';

const theme: ChartTheme = {
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

const PANE_HEIGHT = 200;
// Three 1-minute bars (ms); the middle one is the highest (high = 100).
const bars: OHLCVBar[] = [
  { time: 60_000, open: 1, high: 50, low: 1, close: 40 },
  { time: 120_000, open: 1, high: 100, low: 1, close: 90 },
  { time: 180_000, open: 1, high: 60, low: 1, close: 50 },
];

/** Reserved px = gap(10) + face + edge pad(2). */
const RESERVED_TOP_PX = 10 + AVATAR_SIZE + 2;

function makeChart(priceRange: { from: number; to: number }): TVActiveChart {
  return {
    getVisibleBarsRange: () => ({ from: 60, to: 180 }),
    getTimeScale: () => ({
      width: () => 300,
      barSpacing: () => 100,
      rightOffset: () => 0,
    }),
    getPanes: () => [
      {
        getHeight: () => PANE_HEIGHT,
        getMainSourcePriceScale: () => ({
          getVisiblePriceRange: () => priceRange,
          getMode: () => 0,
          isInverted: () => false,
        }),
      },
    ],
  } as unknown as TVActiveChart;
}

function setup(priceRange: { from: number; to: number }): jest.Mock {
  const applyOverrides = jest.fn();
  const chart = makeChart(priceRange);
  setWidget({
    activeChart: () => chart,
    applyOverrides,
  } as unknown as TVChartingLibraryWidget);
  setChartReady(true);
  setTheme(theme);
  setOhlcvData(bars);
  const container = document.createElement('div');
  container.id = 'tv_chart_container';
  document.body.appendChild(container);
  return applyOverrides;
}

function faceCenterY(): number {
  const overlay = document.getElementById('avatar-marker-overlay');
  const face = overlay?.firstElementChild as HTMLElement | null;
  const match = /calc\(([-\d.]+)px - 50%\)\)$/.exec(
    face?.style.transform ?? '',
  );
  return match ? Number(match[1]) : Number.NaN;
}

const marker = {
  id: 'm1',
  time: 120_000,
  intent: 'enter' as const,
  traderName: 'Alice',
};

describe('avatar marker headroom', () => {
  beforeEach(() => {
    __resetStateForTests();
    __resetAvatarMarkerStateForTests();
    __resetAvatarMarkerRefreshForTests();
    __resetPaneMarginsForTests();
    clearAvatarMarkers();
    document.body.innerHTML = '';
  });

  it('reserves top margin for the faces when markers are set', () => {
    const applyOverrides = setup({ from: 0, to: 120 });

    handleSetAvatarMarkers({ markers: [marker] });

    expect(applyOverrides).toHaveBeenCalledWith({
      'paneProperties.topMargin': Math.ceil(
        (RESERVED_TOP_PX / PANE_HEIGHT) * 100,
      ),
    });
  });

  it('releases the reservation when markers are cleared', () => {
    const applyOverrides = setup({ from: 0, to: 120 });
    handleSetAvatarMarkers({ markers: [marker] });

    handleSetAvatarMarkers({ markers: null });

    expect(applyOverrides).toHaveBeenLastCalledWith({
      'paneProperties.topMargin': BASE_PANE_TOP_MARGIN,
    });
  });

  it('places the face above the candle high when there is room', () => {
    // high 100 in [0, 200] over 200px → y = 100; face center = y - gap - r.
    setup({ from: 0, to: 200 });

    handleSetAvatarMarkers({ markers: [marker] });

    const highY = ((200 - 100) / 200) * PANE_HEIGHT;
    expect(faceCenterY()).toBeCloseTo(highY - 10 - AVATAR_SIZE / 2);
  });

  it('keeps the face inside the pane when the high is at the top edge', () => {
    // Auto-scale off / no headroom: the high sits exactly at y = 0.
    setup({ from: 0, to: 100 });

    handleSetAvatarMarkers({ markers: [marker] });

    expect(faceCenterY()).toBe(AVATAR_SIZE / 2 + 2);
  });
});
