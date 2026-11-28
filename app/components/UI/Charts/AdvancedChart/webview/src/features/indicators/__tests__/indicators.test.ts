/**
 * @jest-environment jsdom
 */
import {
  __resetIndicatorsForTests,
  handleAddIndicator,
  handleRemoveIndicator,
} from '..';
import {
  __resetStateForTests,
  getActiveStudies,
  getLegendStudyOrder,
  registerStudy,
  setChartReady,
  setWidget,
} from '../../../core/state';
import type {
  ChartConfig,
  TVActiveChart,
  TVChartingLibraryWidget,
} from '../../../core/types';

interface ChartMock {
  createStudy: jest.Mock;
  removeEntity: jest.Mock;
  getStudyById: jest.Mock;
  getAllPanesHeight: jest.Mock;
  setAllPanesHeight: jest.Mock;
  exportData: jest.Mock;
}

const makeChart = (
  createStudyImpl?: jest.Mock,
): {
  chart: TVActiveChart;
  mock: ChartMock;
} => {
  const mock: ChartMock = {
    createStudy: createStudyImpl ?? jest.fn().mockResolvedValue('sid-default'),
    removeEntity: jest.fn(),
    getStudyById: jest.fn().mockReturnValue(null),
    getAllPanesHeight: jest.fn().mockReturnValue([300, 100]),
    setAllPanesHeight: jest.fn(),
    exportData: jest.fn().mockResolvedValue({
      schema: [],
      data: [],
    }),
  };
  return { chart: mock as unknown as TVActiveChart, mock };
};

const installRNBridge = (): { postMessage: jest.Mock } => {
  const bridge = { postMessage: jest.fn() };
  (
    window as unknown as { ReactNativeWebView: typeof bridge }
  ).ReactNativeWebView = bridge;
  return bridge;
};

const baseConfig: ChartConfig = {
  libraryUrl: 'https://x/',
  theme: { backgroundColor: 'rgb(0,0,0)' } as ChartConfig['theme'],
  indicatorDefinitions: {
    MACD: {
      study: {
        name: 'MACD',
        inputs: { in_0: 12, in_1: 26, in_2: 9 },
        pane: 'sub',
      },
    },
    MA50: {
      study: {
        name: 'Moving Average',
        inputs: { length: 50 },
        overrides: { 'Plot.color': 'rgb(184, 230, 46)' },
      },
      group: 'MA',
    },
  },
};

const flushMicrotasks = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

const setupReadyWidget = (chart: TVActiveChart): void => {
  setWidget({ activeChart: () => chart } as unknown as TVChartingLibraryWidget);
  setChartReady(true);
};

describe('handleAddIndicator', () => {
  beforeEach(() => {
    __resetStateForTests();
    __resetIndicatorsForTests();
    installRNBridge();
    jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('no-ops when no widget exists', () => {
    handleAddIndicator({ name: 'MACD' }, baseConfig);
    expect(getActiveStudies().size).toBe(0);
  });

  it('no-ops when payload has no name', () => {
    const { chart } = makeChart();
    setupReadyWidget(chart);
    handleAddIndicator({ name: '' }, baseConfig);
    expect(getActiveStudies().size).toBe(0);
  });

  it('skips duplicates', () => {
    const { chart, mock } = makeChart();
    setupReadyWidget(chart);
    registerStudy('MACD', 'existing');
    handleAddIndicator({ name: 'MACD' }, baseConfig);
    expect(mock.createStudy).not.toHaveBeenCalled();
  });

  it('registers + announces a successful add', async () => {
    const createStudy = jest.fn().mockResolvedValue('sid-macd');
    const { chart, mock } = makeChart(createStudy);
    setupReadyWidget(chart);
    handleAddIndicator({ name: 'MACD' }, baseConfig);
    // Flush microtasks for the createStudy promise.
    await Promise.resolve();
    await Promise.resolve();
    expect(mock.createStudy).toHaveBeenCalledWith(
      'MACD',
      false,
      false,
      expect.objectContaining({ in_0: 12 }),
      expect.not.objectContaining({ showLegendValues: false }),
    );
    expect(getActiveStudies().get('MACD')).toBe('sid-macd');
  });

  it('creates moving averages from their definition like any indicator', async () => {
    const createStudy = jest.fn().mockResolvedValue('sid-50');
    const { chart, mock } = makeChart(createStudy);
    setupReadyWidget(chart);

    handleAddIndicator({ name: 'MA50' }, baseConfig);
    await flushMicrotasks();

    expect(mock.createStudy).toHaveBeenCalledWith(
      'Moving Average',
      false,
      false,
      { length: 50 },
      { 'Plot.color': 'rgb(184, 230, 46)' },
    );
    expect(getActiveStudies().get('MA50')).toBe('sid-50');
    expect(getLegendStudyOrder().get('MA50')).toBe('sid-50');
  });

  it('creates a consumer-defined study that has no built-in preset', async () => {
    const createStudy = jest.fn().mockResolvedValue('sid-ema');
    const { chart, mock } = makeChart(createStudy);
    setupReadyWidget(chart);
    const config: ChartConfig = {
      ...baseConfig,
      indicatorDefinitions: {
        EMA21: {
          study: {
            name: 'Moving Average Exponential',
            inputs: { length: 21 },
          },
        },
      },
    };

    handleAddIndicator({ name: 'EMA21' }, config);
    await flushMicrotasks();

    expect(mock.createStudy).toHaveBeenCalledWith(
      'Moving Average Exponential',
      false,
      false,
      { length: 21 },
      {},
    );
    expect(getActiveStudies().get('EMA21')).toBe('sid-ema');
  });

  it('merges runtime inputs over the definition inputs', async () => {
    const { chart, mock } = makeChart();
    setupReadyWidget(chart);

    handleAddIndicator({ name: 'MA50', inputs: { length: 55 } }, baseConfig);
    await flushMicrotasks();

    expect(mock.createStudy.mock.calls[0][3]).toEqual({ length: 55 });
  });

  it('does not create a second study while the first create is pending', () => {
    const createStudy = jest.fn().mockReturnValue(new Promise(() => undefined));
    const { chart, mock } = makeChart(createStudy);
    setupReadyWidget(chart);

    handleAddIndicator({ name: 'MACD' }, baseConfig);
    handleAddIndicator({ name: 'MACD' }, baseConfig);

    expect(mock.createStudy).toHaveBeenCalledTimes(1);
  });

  it('removes a study that was removed while its create was pending', async () => {
    let resolveCreate: (id: string) => void = () => undefined;
    const createStudy = jest.fn().mockReturnValue(
      new Promise<string>((resolve) => {
        resolveCreate = resolve;
      }),
    );
    const { chart, mock } = makeChart(createStudy);
    setupReadyWidget(chart);

    handleAddIndicator({ name: 'MA50' }, baseConfig);
    handleRemoveIndicator({ name: 'MA50' });
    resolveCreate('sid-50');
    await flushMicrotasks();

    expect(mock.removeEntity).toHaveBeenCalledWith('sid-50');
    expect(getActiveStudies().has('MA50')).toBe(false);
  });
});

describe('handleRemoveIndicator', () => {
  beforeEach(() => {
    __resetStateForTests();
    __resetIndicatorsForTests();
    installRNBridge();
  });

  it('removes an active study and emits INDICATOR_REMOVED', () => {
    const { chart, mock } = makeChart();
    setupReadyWidget(chart);
    registerStudy('RSI', 'sid-rsi');
    handleRemoveIndicator({ name: 'RSI' });
    expect(mock.removeEntity).toHaveBeenCalledWith('sid-rsi');
    expect(getActiveStudies().has('RSI')).toBe(false);
  });

  it('removes moving averages through the same path', () => {
    const { chart, mock } = makeChart();
    setupReadyWidget(chart);
    registerStudy('MA5', 'sid-5');
    registerStudy('MA10', 'sid-10');

    handleRemoveIndicator({ name: 'MA5' });

    expect(mock.removeEntity).toHaveBeenCalledWith('sid-5');
    expect(getActiveStudies().has('MA5')).toBe(false);
    expect(getActiveStudies().has('MA10')).toBe(true);
  });

  it('no-ops when the indicator is not active', () => {
    const { chart, mock } = makeChart();
    setupReadyWidget(chart);
    handleRemoveIndicator({ name: 'RSI' });
    expect(mock.removeEntity).not.toHaveBeenCalled();
  });
});
