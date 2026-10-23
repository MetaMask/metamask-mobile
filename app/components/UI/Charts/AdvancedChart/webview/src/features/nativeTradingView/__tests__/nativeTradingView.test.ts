/**
 * @jest-environment jsdom
 */
import { attachNativeTradingViewBridge } from '..';
import type {
  TVActiveChart,
  TVChartingLibraryWidget,
  TVEntityInfo,
} from '../../../core/types';

interface MockBridge {
  postMessage: jest.Mock<void, [string]>;
}

type EntityEventHandler = (entityId: string, eventType: string) => void;

const installRNBridge = (): MockBridge => {
  const bridge: MockBridge = { postMessage: jest.fn() };
  (
    window as unknown as { ReactNativeWebView?: MockBridge }
  ).ReactNativeWebView = bridge;
  return bridge;
};

const createWidget = () => {
  const handlers: Record<string, EntityEventHandler> = {};
  const widget = {
    subscribe: jest.fn((event: string, handler: EntityEventHandler) => {
      handlers[event] = handler;
    }),
  } as unknown as TVChartingLibraryWidget;
  return { widget, handlers };
};

const createChart = (
  studies: TVEntityInfo[] = [],
  shapes: TVEntityInfo[] = [],
): TVActiveChart =>
  ({
    getAllStudies: () => studies,
    getAllShapes: () => shapes,
  }) as unknown as TVActiveChart;

const postedMessages = (bridge: MockBridge) =>
  bridge.postMessage.mock.calls.map(([raw]) => JSON.parse(raw));

describe('attachNativeTradingViewBridge', () => {
  let bridge: MockBridge;

  beforeEach(() => {
    bridge = installRNBridge();
  });

  afterEach(() => {
    delete (window as unknown as { ReactNativeWebView?: unknown })
      .ReactNativeWebView;
  });

  it('posts a study event with the study name resolved from the chart', () => {
    const { widget, handlers } = createWidget();
    const chart = createChart([{ id: 'st1', name: 'Relative Strength Index' }]);
    attachNativeTradingViewBridge(widget, chart);

    handlers.study_event('st1', 'create');

    expect(postedMessages(bridge)).toEqual([
      {
        type: 'NATIVE_TV_EVENT',
        payload: {
          source: 'study',
          type: 'create',
          id: 'st1',
          name: 'Relative Strength Index',
        },
      },
    ]);
  });

  it('posts a drawing event with the shape name resolved from the chart', () => {
    const { widget, handlers } = createWidget();
    const chart = createChart([], [{ id: 'sh1', name: 'trend_line' }]);
    attachNativeTradingViewBridge(widget, chart);

    handlers.drawing_event('sh1', 'points_changed');

    expect(postedMessages(bridge)).toEqual([
      {
        type: 'NATIVE_TV_EVENT',
        payload: {
          source: 'drawing',
          type: 'points_changed',
          id: 'sh1',
          name: 'trend_line',
        },
      },
    ]);
  });

  it('omits the name of a drawing that no longer exists on the chart', () => {
    const { widget, handlers } = createWidget();
    attachNativeTradingViewBridge(widget, createChart());

    handlers.drawing_event('gone', 'remove');

    expect(postedMessages(bridge)).toEqual([
      {
        type: 'NATIVE_TV_EVENT',
        payload: { source: 'drawing', type: 'remove', id: 'gone' },
      },
    ]);
  });

  it('reports an ERROR to RN when the widget refuses the subscription', () => {
    const widget = {
      subscribe: jest.fn(() => {
        throw new Error('subscribe unavailable');
      }),
    } as unknown as TVChartingLibraryWidget;

    attachNativeTradingViewBridge(widget, createChart());

    expect(postedMessages(bridge)).toEqual([
      { type: 'ERROR', payload: { message: 'subscribe unavailable' } },
    ]);
  });
});
