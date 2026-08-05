/**
 * @jest-environment jsdom
 */
import { applyVisualOverrides, buildVisualOverrides } from '../visualOverrides';
import { __resetStateForTests, setWidget } from '../../core/state';
import type { TVChartingLibraryWidget } from '../../core/types';

describe('buildVisualOverrides', () => {
  it('returns empty when config is undefined or empty', () => {
    expect(buildVisualOverrides(undefined)).toEqual({});
    expect(buildVisualOverrides({})).toEqual({});
  });

  it('applies gridLineColor to vert + horz grid overrides', () => {
    const overrides = buildVisualOverrides({ gridLineColor: 'rgb(1,2,3)' });
    expect(overrides['paneProperties.vertGridProperties.color']).toBe(
      'rgb(1,2,3)',
    );
    expect(overrides['paneProperties.horzGridProperties.color']).toBe(
      'rgb(1,2,3)',
    );
  });

  it('sets a transparent separator when hidePaneSeparator is true', () => {
    expect(buildVisualOverrides({ hidePaneSeparator: true })).toEqual({
      'paneProperties.separatorColor': 'rgba(0,0,0,0)',
    });
  });

  it('passes currentPriceLineColor through', () => {
    expect(
      buildVisualOverrides({ currentPriceLineColor: 'rgb(9,9,9)' }),
    ).toEqual({ 'mainSeriesProperties.priceLineColor': 'rgb(9,9,9)' });
  });
});

describe('applyVisualOverrides', () => {
  beforeEach(() => {
    __resetStateForTests();
    delete (window as unknown as { ReactNativeWebView?: unknown })
      .ReactNativeWebView;
  });

  it('is a no-op when no widget exists', () => {
    expect(() =>
      applyVisualOverrides({ gridLineColor: 'rgb(1,2,3)' }),
    ).not.toThrow();
  });

  it('calls widget.applyOverrides with the built overrides', () => {
    const applyOverrides = jest.fn();
    setWidget({ applyOverrides } as unknown as TVChartingLibraryWidget);
    applyVisualOverrides({ gridLineColor: 'rgb(1,2,3)' });
    expect(applyOverrides).toHaveBeenCalledWith({
      'paneProperties.vertGridProperties.color': 'rgb(1,2,3)',
      'paneProperties.horzGridProperties.color': 'rgb(1,2,3)',
    });
  });

  it('skips applyOverrides when the built object is empty', () => {
    const applyOverrides = jest.fn();
    setWidget({ applyOverrides } as unknown as TVChartingLibraryWidget);
    applyVisualOverrides(undefined);
    applyVisualOverrides({});
    expect(applyOverrides).not.toHaveBeenCalled();
  });

  it('reports applyOverrides errors to RN', () => {
    const bridge = { postMessage: jest.fn() };
    (
      window as unknown as { ReactNativeWebView: typeof bridge }
    ).ReactNativeWebView = bridge;
    setWidget({
      applyOverrides: () => {
        throw new Error('o fail');
      },
    } as unknown as TVChartingLibraryWidget);
    applyVisualOverrides({ gridLineColor: 'rgb(1,2,3)' });
    expect(bridge.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('"message":"o fail"'),
    );
  });
});
