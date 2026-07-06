/**
 * @jest-environment jsdom
 */
import { handleSetPositionLines, registerPositionLinesOverlay } from '../index';
import {
  __resetStateForTests,
  getHasExplicitCurrentPriceLine,
  setChartReady,
  setTheme,
  setWidget,
} from '../../../core/state';
import {
  __resetPositionLineStateForTests,
  getPositionShapeIds,
} from '../state';
import {
  __resetHandlersForTests,
  dispatchInboundMessage,
} from '../../../messages/handler';
import {
  notifyDataLifecycle,
  __resetDataLifecycleForTests,
} from '../../../core/dataLifecycle';
import type {
  ChartTheme,
  TVChartingLibraryWidget,
  TVShapeId,
} from '../../../core/types';

const baseTheme: ChartTheme = {
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

let shapeIdCounter = 0;

function makeWidget(): {
  widget: TVChartingLibraryWidget;
  applyOverrides: jest.Mock;
  createShape: jest.Mock;
  removeEntity: jest.Mock;
} {
  const applyOverrides = jest.fn();
  const removeEntity = jest.fn();
  const createShape = jest.fn().mockImplementation(() => {
    shapeIdCounter += 1;
    return Promise.resolve(`shape-${shapeIdCounter}` as TVShapeId);
  });
  const widget = {
    applyOverrides,
    activeChart: () => ({
      createShape,
      removeEntity,
    }),
  } as unknown as TVChartingLibraryWidget;
  return { widget, applyOverrides, createShape, removeEntity };
}

function installWidget(): ReturnType<typeof makeWidget> {
  const result = makeWidget();
  setWidget(result.widget);
  setChartReady(true);
  setTheme(baseTheme);
  return result;
}

describe('positionLines/index', () => {
  beforeEach(() => {
    __resetStateForTests();
    __resetPositionLineStateForTests();
    __resetHandlersForTests();
    __resetDataLifecycleForTests();
    shapeIdCounter = 0;
    delete (window as unknown as { ReactNativeWebView?: unknown })
      .ReactNativeWebView;
  });

  it('no-ops when widget is not ready', () => {
    expect(() =>
      handleSetPositionLines({
        position: { side: 'long', entryPrice: 100 },
      }),
    ).not.toThrow();
  });

  it('clears position lines and re-enables TV price line when position is null', () => {
    const { applyOverrides } = installWidget();

    handleSetPositionLines({ position: null });

    expect(getHasExplicitCurrentPriceLine()).toBe(false);
    expect(applyOverrides).toHaveBeenCalledWith(
      expect.objectContaining({
        'mainSeriesProperties.showPriceLine': true,
      }),
    );
  });

  it('creates horizontal line shapes for each position field', async () => {
    const { createShape } = installWidget();

    handleSetPositionLines({
      position: {
        side: 'long',
        entryPrice: 42000,
        takeProfitPrice: 45000,
        stopLossPrice: 40000,
        liquidationPrice: 38000,
        currentPrice: 42500,
      },
      positionLineColors: {
        currentPrice: 'rgb(255,255,255)',
        entry: 'rgb(170,170,170)',
        takeProfit: 'rgb(0,255,0)',
        stopLoss: 'rgb(255,0,0)',
        liquidation: 'rgb(255,255,0)',
      },
    });

    expect(createShape).toHaveBeenCalledTimes(5);

    // Verify entry line — text is a top-level createShape option, not inside overrides
    const entryCall = createShape.mock.calls.find(
      (call: unknown[]) =>
        (call[1] as Record<string, unknown>).text === 'Entry',
    );
    expect(entryCall).toBeDefined();
    expect(entryCall[0]).toEqual({ price: 42000 });
    expect(
      (entryCall[1] as Record<string, Record<string, unknown>>).overrides,
    ).not.toHaveProperty('text');

    // Wait for shape promises to resolve
    await Promise.resolve();
    await Promise.resolve();
    expect(getPositionShapeIds().length).toBeGreaterThan(0);
  });

  it('sets hasExplicitCurrentPriceLine when currentPrice is provided', () => {
    const { applyOverrides } = installWidget();

    handleSetPositionLines({
      position: {
        side: 'long',
        entryPrice: 42000,
        currentPrice: 42500,
      },
    });

    expect(getHasExplicitCurrentPriceLine()).toBe(true);
    expect(applyOverrides).toHaveBeenCalledWith(
      expect.objectContaining({
        'mainSeriesProperties.showPriceLine': false,
      }),
    );
  });

  it('does not set hasExplicitCurrentPriceLine when currentPrice is absent', () => {
    const { applyOverrides } = installWidget();

    handleSetPositionLines({
      position: {
        side: 'long',
        entryPrice: 42000,
      },
    });

    expect(getHasExplicitCurrentPriceLine()).toBe(false);
    expect(applyOverrides).toHaveBeenCalledWith(
      expect.objectContaining({
        'mainSeriesProperties.showPriceLine': true,
      }),
    );
  });

  it('falls back to theme colors when positionLineColors is not provided', () => {
    const { createShape } = installWidget();

    handleSetPositionLines({
      position: {
        side: 'short',
        entryPrice: 42000,
        takeProfitPrice: 45000,
      },
    });

    expect(createShape).toHaveBeenCalledTimes(2);
    const entryOverrides = (
      createShape.mock.calls[0][1] as Record<string, Record<string, unknown>>
    ).overrides;
    expect(entryOverrides.linecolor).toBe(baseTheme.borderColor);

    const tpOverrides = (
      createShape.mock.calls[1][1] as Record<string, Record<string, unknown>>
    ).overrides;
    expect(tpOverrides.linecolor).toBe(baseTheme.successColor);
  });

  it('clears existing shapes before creating new ones', async () => {
    const { createShape, removeEntity } = installWidget();

    handleSetPositionLines({
      position: { side: 'long', entryPrice: 42000 },
    });
    await Promise.resolve();
    await Promise.resolve();

    handleSetPositionLines({
      position: { side: 'long', entryPrice: 43000 },
    });

    expect(removeEntity).toHaveBeenCalled();
  });

  it('reports errors from createShape to RN', () => {
    const bridge = { postMessage: jest.fn() };
    (
      window as unknown as { ReactNativeWebView: typeof bridge }
    ).ReactNativeWebView = bridge;

    const throwingWidget = {
      applyOverrides: jest.fn(),
      activeChart: () => ({
        createShape: () => {
          throw new Error('chart disposed');
        },
        removeEntity: jest.fn(),
      }),
    } as unknown as TVChartingLibraryWidget;
    setWidget(throwingWidget);
    setChartReady(true);
    setTheme(baseTheme);

    handleSetPositionLines({
      position: { side: 'long', entryPrice: 42000 },
    });

    expect(bridge.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('"type":"ERROR"'),
    );
  });

  it('no-ops when theme is null', () => {
    const { createShape } = installWidget();
    setTheme(null as unknown as ChartTheme);

    handleSetPositionLines({
      position: { side: 'long', entryPrice: 42000 },
    });

    expect(createShape).not.toHaveBeenCalled();
  });

  it('removes orphaned shapes when generation changes before promise resolves', async () => {
    const { createShape, removeEntity } = installWidget();

    // First call creates a shape whose promise is still pending
    handleSetPositionLines({
      position: { side: 'long', entryPrice: 42000 },
    });

    // Second call (clear) bumps generation before the first promise resolves
    handleSetPositionLines({ position: null });

    // Let the first createShape promise resolve
    await Promise.resolve();
    await Promise.resolve();

    // The stale shape should be removed immediately, not tracked
    expect(removeEntity).toHaveBeenCalledWith('shape-1');
    expect(getPositionShapeIds()).toEqual([]);
  });

  describe('registerPositionLinesOverlay', () => {
    it('registers SET_POSITION_LINES handler', () => {
      installWidget();
      registerPositionLinesOverlay();

      dispatchInboundMessage({
        type: 'SET_POSITION_LINES',
        payload: { position: null },
      });

      expect(getHasExplicitCurrentPriceLine()).toBe(false);
    });

    it('clears shape IDs on ohlcvReset', async () => {
      installWidget();
      registerPositionLinesOverlay();

      handleSetPositionLines({
        position: { side: 'long', entryPrice: 42000 },
      });
      await Promise.resolve();
      await Promise.resolve();

      notifyDataLifecycle('ohlcvReset');
      expect(getPositionShapeIds()).toEqual([]);
    });
  });
});
