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
});
