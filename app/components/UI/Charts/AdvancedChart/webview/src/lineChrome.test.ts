import {
  LINE_CHROME_DEFAULTS,
  lineChromePickBool,
  getLineChrome,
  resolveLineChromeFromPayload,
} from './lineChrome';

import { setState, resetState, type ChartState } from './state';

afterEach(() => resetState());

describe('LINE_CHROME_DEFAULTS', () => {
  it('has all four keys', () => {
    expect(LINE_CHROME_DEFAULTS).toEqual({
      hideTimeScale: false,
      useCustomLineEndMarker: true,
      useCustomDashedLastPriceLine: true,
      useCustomPriceLabels: true,
    });
  });
});

describe('lineChromePickBool', () => {
  it('returns the value when present', () => {
    expect(
      lineChromePickBool({ hideTimeScale: true }, 'hideTimeScale', false),
    ).toBe(true);
  });

  it('coerces truthy values to boolean', () => {
    expect(
      lineChromePickBool(
        { hideTimeScale: 1 } as Record<string, unknown>,
        'hideTimeScale',
        false,
      ),
    ).toBe(true);
  });

  it('returns fallback when key is undefined', () => {
    expect(
      lineChromePickBool({} as Record<string, unknown>, 'hideTimeScale', true),
    ).toBe(true);
  });
});

describe('getLineChrome', () => {
  it('returns defaults when CONFIG has no lineChrome', () => {
    setState({ CONFIG: { theme: {} } } as Partial<ChartState>);
    expect(getLineChrome()).toEqual(LINE_CHROME_DEFAULTS);
  });

  it('merges CONFIG.lineChrome with defaults', () => {
    setState({
      CONFIG: { lineChrome: { hideTimeScale: true } },
    } as Partial<ChartState>);
    const result = getLineChrome();
    expect(result.hideTimeScale).toBe(true);
    expect(result.useCustomLineEndMarker).toBe(true);
  });
});

describe('resolveLineChromeFromPayload', () => {
  it('returns null for falsy payload', () => {
    expect(resolveLineChromeFromPayload(null)).toBeNull();
    expect(resolveLineChromeFromPayload(undefined)).toBeNull();
  });

  it('returns null for non-object', () => {
    expect(resolveLineChromeFromPayload('string' as unknown)).toBeNull();
  });

  it('fills missing keys with defaults', () => {
    const result = resolveLineChromeFromPayload({ hideTimeScale: true });
    expect(result).toEqual({
      hideTimeScale: true,
      useCustomLineEndMarker: true,
      useCustomDashedLastPriceLine: true,
      useCustomPriceLabels: true,
    });
  });

  it('resolves all fields from payload', () => {
    const result = resolveLineChromeFromPayload({
      hideTimeScale: false,
      useCustomLineEndMarker: false,
      useCustomDashedLastPriceLine: false,
      useCustomPriceLabels: false,
    });
    expect(result).toEqual({
      hideTimeScale: false,
      useCustomLineEndMarker: false,
      useCustomDashedLastPriceLine: false,
      useCustomPriceLabels: false,
    });
  });
});
