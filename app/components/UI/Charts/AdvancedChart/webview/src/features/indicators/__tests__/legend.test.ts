/**
 * @jest-environment jsdom
 */
import {
  __resetLegendForTests,
  refreshStudyLegendFromExport,
  setupLegendOverlay,
  updateLegendOverlayLayout,
} from '../legend';
import {
  __resetStateForTests,
  registerStudy,
  setChartReady,
  setWidget,
} from '../../../core/state';
import type {
  TVActiveChart,
  TVChartingLibraryWidget,
} from '../../../core/types';

const installContainer = (): HTMLElement => {
  document.body.innerHTML = '<div id="tv_chart_container"></div>';
  return document.getElementById('tv_chart_container') as HTMLElement;
};

describe('setupLegendOverlay', () => {
  beforeEach(() => {
    __resetStateForTests();
    __resetLegendForTests();
    document.body.innerHTML = '';
  });

  it('is a no-op when overlay is disabled', () => {
    installContainer();
    setupLegendOverlay({ enabled: false }, undefined);
    expect(document.getElementById('study-legend-overlay')).toBeNull();
  });

  it('creates the overlay element inside #tv_chart_container', () => {
    const container = installContainer();
    setupLegendOverlay({ enabled: true }, undefined);
    const overlay = document.getElementById('study-legend-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay?.parentElement).toBe(container);
  });

  it('replaces an existing overlay if called twice', () => {
    installContainer();
    setupLegendOverlay({ enabled: true }, undefined);
    setupLegendOverlay({ enabled: true }, undefined);
    expect(document.querySelectorAll('#study-legend-overlay').length).toBe(1);
  });
});

describe('refreshStudyLegendFromExport', () => {
  beforeEach(() => {
    __resetStateForTests();
    __resetLegendForTests();
    document.body.innerHTML = '';
  });

  it('is a no-op when overlay is disabled', () => {
    expect(() => refreshStudyLegendFromExport()).not.toThrow();
  });

  it('clears overlay HTML when no studies are registered', () => {
    installContainer();
    setupLegendOverlay({ enabled: true }, undefined);
    const overlay = document.getElementById(
      'study-legend-overlay',
    ) as HTMLElement;
    overlay.innerHTML = '<span class="legend-pill">stale</span>';

    const chart = {} as TVActiveChart;
    setWidget({
      activeChart: () => chart,
    } as unknown as TVChartingLibraryWidget);
    setChartReady(true);

    refreshStudyLegendFromExport();
    expect(overlay.innerHTML).toBe('');
  });

  it('calls chart.exportData with the registered studyIds', () => {
    installContainer();
    setupLegendOverlay({ enabled: true }, undefined);
    const exportData = jest.fn().mockResolvedValue({ schema: [], data: [] });
    const chart = { exportData } as unknown as TVActiveChart;
    setWidget({
      activeChart: () => chart,
    } as unknown as TVChartingLibraryWidget);
    setChartReady(true);
    registerStudy('active', 'MACD', 'sid-macd');

    refreshStudyLegendFromExport();

    expect(exportData).toHaveBeenCalledWith({
      includeSeries: false,
      includedStudies: ['sid-macd'],
    });
  });
});

describe('updateLegendOverlayLayout', () => {
  beforeEach(() => {
    __resetLegendForTests();
    document.body.innerHTML = '';
  });

  it('is a no-op when overlay element does not exist', () => {
    expect(() => updateLegendOverlayLayout()).not.toThrow();
  });

  it('sets a fallback max-width when no price-axis is found', () => {
    installContainer();
    setupLegendOverlay({ enabled: true }, undefined);
    updateLegendOverlayLayout();
    const overlay = document.getElementById('study-legend-overlay');
    expect(overlay?.style.maxWidth).toBe('calc(100% - 56px)');
  });
});
