/**
 * @jest-environment jsdom
 */
import { handleToggleVolume } from '..';
import {
  __resetStateForTests,
  getVolumeIsOverlay,
  getVolumeStudyId,
  setChartReady,
  setTheme,
  setVolumeIsOverlay,
  setVolumeStudyId,
  setWidget,
} from '../../../core/state';
import type {
  ChartTheme,
  TVActiveChart,
  TVChartingLibraryWidget,
} from '../../../core/types';

interface ChartMock {
  createStudy: jest.Mock;
  removeEntity: jest.Mock;
  getAllPanesHeight: jest.Mock;
  setAllPanesHeight: jest.Mock;
}

const makeChart = (
  createStudyImpl?: jest.Mock,
): {
  chart: TVActiveChart;
  mock: ChartMock;
} => {
  const mock: ChartMock = {
    createStudy: createStudyImpl ?? jest.fn().mockResolvedValue('vol-1'),
    removeEntity: jest.fn(),
    getAllPanesHeight: jest.fn().mockReturnValue([300, 100]),
    setAllPanesHeight: jest.fn(),
  };
  return { chart: mock as unknown as TVActiveChart, mock };
};

const setupReadyWidget = (chart: TVActiveChart): void => {
  setWidget({ activeChart: () => chart } as unknown as TVChartingLibraryWidget);
  setChartReady(true);
};

const theme: ChartTheme = {
  successColor: 'rgb(0,255,0)',
  errorColor: 'rgb(255,0,0)',
} as ChartTheme;

describe('handleToggleVolume', () => {
  beforeEach(() => {
    __resetStateForTests();
    setTheme(theme);
    jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      });
  });

  afterEach(() => jest.restoreAllMocks());

  it('removes the existing volume study when visible=false', () => {
    const { chart, mock } = makeChart();
    setupReadyWidget(chart);
    setVolumeStudyId('vol-existing');
    setVolumeIsOverlay(false);

    handleToggleVolume({ visible: false });

    expect(mock.removeEntity).toHaveBeenCalledWith('vol-existing');
    expect(getVolumeStudyId()).toBeNull();
    expect(getVolumeIsOverlay()).toBeNull();
  });

  it('creates a sub-pane volume study when visible=true and volumeOverlay omitted', async () => {
    const createStudy = jest.fn().mockResolvedValue('new-vol');
    const { chart, mock } = makeChart(createStudy);
    setupReadyWidget(chart);

    handleToggleVolume({ visible: true });

    expect(mock.createStudy).toHaveBeenCalledWith(
      'Volume',
      false,
      false,
      {},
      expect.objectContaining({ 'volume.color.0': 'rgb(255,0,0)' }),
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(getVolumeStudyId()).toBe('new-vol');
    expect(getVolumeIsOverlay()).toBe(false);
  });

  it('creates an overlay-mode volume study when volumeOverlay=true', async () => {
    const createStudy = jest.fn().mockResolvedValue('new-vol');
    const { chart, mock } = makeChart(createStudy);
    setupReadyWidget(chart);

    handleToggleVolume({ visible: true, volumeOverlay: true });

    expect(mock.createStudy).toHaveBeenCalledWith(
      'Volume',
      true,
      false,
      {},
      expect.objectContaining({ 'volume.transparency': 70 }),
      { priceScale: 'no-scale' },
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(getVolumeIsOverlay()).toBe(true);
  });

  it('switches from sub-pane to overlay by removing then recreating', async () => {
    const createStudy = jest.fn().mockResolvedValue('vol-2');
    const { chart, mock } = makeChart(createStudy);
    setupReadyWidget(chart);
    setVolumeStudyId('vol-existing');
    setVolumeIsOverlay(false);

    handleToggleVolume({ visible: true, volumeOverlay: true });

    expect(mock.removeEntity).toHaveBeenCalledWith('vol-existing');
    expect(mock.createStudy).toHaveBeenCalledWith(
      'Volume',
      true,
      false,
      {},
      expect.any(Object),
      { priceScale: 'no-scale' },
    );
  });

  it('no-ops when widget is not ready', () => {
    expect(() => handleToggleVolume({ visible: true })).not.toThrow();
  });

  it('no-ops when payload is null', () => {
    const { chart } = makeChart();
    setupReadyWidget(chart);
    expect(() =>
      handleToggleVolume(null as unknown as { visible: boolean }),
    ).not.toThrow();
  });

  it('no-ops on visible=false when no existing study', () => {
    const { chart, mock } = makeChart();
    setupReadyWidget(chart);
    handleToggleVolume({ visible: false });
    expect(mock.removeEntity).not.toHaveBeenCalled();
    expect(getVolumeIsOverlay()).toBeNull();
  });

  it('swallows removeEntity errors on visible=false', () => {
    const { chart } = makeChart();
    (chart as unknown as ChartMock).removeEntity = jest.fn(() => {
      throw new Error('disposed');
    });
    const bridge = { postMessage: jest.fn() };
    (
      window as unknown as { ReactNativeWebView: typeof bridge }
    ).ReactNativeWebView = bridge;
    setupReadyWidget(chart);
    setVolumeStudyId('vol-existing');
    setVolumeIsOverlay(false);

    handleToggleVolume({ visible: false });

    expect(getVolumeStudyId()).toBeNull();
    expect(bridge.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('"type":"ERROR"'),
    );
  });

  it('does not re-create when same overlay mode is already active', async () => {
    const createStudy = jest.fn().mockResolvedValue('vol-1');
    const { chart, mock } = makeChart(createStudy);
    setupReadyWidget(chart);

    handleToggleVolume({ visible: true, volumeOverlay: true });
    await Promise.resolve();
    await Promise.resolve();

    createStudy.mockClear();
    handleToggleVolume({ visible: true, volumeOverlay: true });
    expect(createStudy).not.toHaveBeenCalled();
  });

  it('applies sub-pane heights after creating a sub-pane study', async () => {
    const createStudy = jest.fn().mockResolvedValue('new-vol');
    const { chart, mock } = makeChart(createStudy);
    setupReadyWidget(chart);

    handleToggleVolume({ visible: true });
    await Promise.resolve();
    await Promise.resolve();

    expect(mock.setAllPanesHeight).toHaveBeenCalled();
    const heights = mock.setAllPanesHeight.mock.calls[0][0] as number[];
    expect(heights[0] + heights[1]).toBe(400);
  });

  it('builds overrides without theme colors when theme is null', () => {
    const createStudy = jest.fn().mockResolvedValue('vol-x');
    const { chart, mock } = makeChart(createStudy);
    setupReadyWidget(chart);
    setTheme(null as unknown as ChartTheme);

    handleToggleVolume({ visible: true });
    expect(mock.createStudy).toHaveBeenCalledWith(
      'Volume',
      false,
      false,
      {},
      expect.objectContaining({ 'volume ma.display': 0 }),
    );
  });

  it('swallows createStudy rejection', async () => {
    const createStudy = jest.fn().mockRejectedValue(new Error('study fail'));
    const { chart } = makeChart(createStudy);
    const bridge = { postMessage: jest.fn() };
    (
      window as unknown as { ReactNativeWebView: typeof bridge }
    ).ReactNativeWebView = bridge;
    setupReadyWidget(chart);

    handleToggleVolume({ visible: true });
    await Promise.resolve();
    await Promise.resolve();

    expect(bridge.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('"type":"ERROR"'),
    );
  });
});

describe('registerVolumeThemeSync', () => {
  beforeEach(() => {
    __resetStateForTests();
    setTheme(theme);
    jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      });
  });
  afterEach(() => jest.restoreAllMocks());

  it('recolors volume study when theme changes', async () => {
    const { registerVolumeThemeSync } = await import('..');
    const { applyThemeColors } = await import('../../../widget/theme');
    const applyOverrides = jest.fn();
    const createStudy = jest.fn().mockResolvedValue('vol-sync');
    const chart = {
      createStudy,
      removeEntity: jest.fn(),
      getAllPanesHeight: jest.fn().mockReturnValue([300, 100]),
      setAllPanesHeight: jest.fn(),
      getStudyById: () => ({ applyOverrides }),
    } as unknown as TVActiveChart;
    setWidget({
      activeChart: () => chart,
    } as unknown as TVChartingLibraryWidget);
    setChartReady(true);

    registerVolumeThemeSync();

    handleToggleVolume({ visible: true, volumeOverlay: true });
    await Promise.resolve();
    await Promise.resolve();

    applyThemeColors({ successColor: 'rgb(0,200,0)' });
    expect(applyOverrides).toHaveBeenCalledWith(
      expect.objectContaining({
        'volume.color.1': expect.any(String),
      }),
    );
  });
});
