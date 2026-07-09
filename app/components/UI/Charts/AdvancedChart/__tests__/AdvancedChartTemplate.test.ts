import { createAdvancedChartTemplate } from '../AdvancedChartTemplate';
import { LIGHT_MODE_SUCCESS_GREEN, mockTheme } from '../../../../../util/theme';

describe('createAdvancedChartTemplate', () => {
  it('defaults useSubscriptPriceFormat to false in CONFIG', () => {
    const html = createAdvancedChartTemplate(mockTheme);
    expect(html).toContain('useSubscriptPriceFormat: false');
  });

  it('bakes useSubscriptPriceFormat true when opted in', () => {
    const html = createAdvancedChartTemplate(mockTheme, {
      useSubscriptPriceFormat: true,
    });
    expect(html).toContain('useSubscriptPriceFormat: true');
  });

  it('uses current-price override for the last-close label background', () => {
    const currentPriceColor = '#ffffff0a';

    const html = createAdvancedChartTemplate(mockTheme, {
      currentPriceLineColorOverride: currentPriceColor,
    });

    expect(html).toContain(`background: ${currentPriceColor};`);
  });

  it('uses the default chart line color for the last-close label without current-price override', () => {
    const html = createAdvancedChartTemplate(mockTheme);

    expect(html).toContain(`background: ${LIGHT_MODE_SUCCESS_GREEN};`);
  });

  it('keeps pane separators visible by default', () => {
    const html = createAdvancedChartTemplate(mockTheme);

    expect(html).toContain('hidePaneSeparator: false');
  });

  it('can opt in to hiding pane separators', () => {
    const html = createAdvancedChartTemplate(mockTheme, {
      hidePaneSeparator: true,
    });

    expect(html).toContain('hidePaneSeparator: true');
  });

  it('keeps grid lines transparent by default', () => {
    const html = createAdvancedChartTemplate(mockTheme);

    expect(html).toContain("gridLineColor: 'transparent'");
  });

  it('can opt in to visible grid lines', () => {
    const gridLineColor = 'rgb(18, 52, 86)';
    const html = createAdvancedChartTemplate(mockTheme, {
      gridLineColorOverride: gridLineColor,
    });

    expect(html).toContain(`gridLineColor: '${gridLineColor}'`);
  });

  it('preserves alpha for grid line colors', () => {
    const html = createAdvancedChartTemplate(mockTheme, {
      gridLineColorOverride: '#ffffff1a',
    });

    expect(html).toContain("gridLineColor: 'rgba(255, 255, 255, 0.102)'");
  });

  it('uses Map APIs for RN-backed pending older-bar callbacks', () => {
    const html = createAdvancedChartTemplate(mockTheme);

    expect(html).toContain('pendingCallbacks = new Map()');
    expect(html).toContain('pendingCallbacks.get(payload.requestId)');
    expect(html).toContain('pendingCallbacks.delete(payload.requestId)');
    expect(html).toContain('pendingCallbacks.set(requestId, {');
  });

  it('resolves RN-backed pending older-bar callbacks before discarding them', () => {
    const html = createAdvancedChartTemplate(mockTheme);

    expect(html).toContain('function resolvePendingNoData(pending)');
    expect(html).toContain('pending.onResult([], { noData: true });');
    expect(html).toContain('function resolveAllPendingOlderBarsNoData()');
    expect(html).toContain('resolveAllPendingOlderBarsNoData();');
    expect(html).toContain('resolvePendingNoData(pending);');
  });

  it('deduplicates RN-backed older bars before prepending them', () => {
    const html = createAdvancedChartTemplate(mockTheme);

    expect(html).toContain('const existingTimes = new Set()');
    expect(html).toContain('existingTimes.add(bar.time)');
    expect(html).toContain(
      'bar.time < pending.oldestAtDefer && !existingTimes.has(bar.time)',
    );
  });

  it('posts RN-backed older-bar requests and accepts noData responses', () => {
    const html = createAdvancedChartTemplate(mockTheme);

    expect(html).toContain("postToRN('FETCH_OLDER_BARS_REQUEST',");
    expect(html).toContain('payload.noData');
    expect(html).toContain('pending.onResult([], { noData: true });');
  });

  it('uses monotonic RN-backed older-bar request ids without Math.random', () => {
    const html = createAdvancedChartTemplate(mockTheme);

    expect(html).toContain('requestSeq += 1;');
    expect(html).toContain(
      "const requestId = 'obr-' + gen + '-' + requestSeq;",
    );
    expect(html).not.toContain('Math.random');
  });

  it('resets the main price scale autoscale after OHLCV reloads', () => {
    const html = createAdvancedChartTemplate(mockTheme);

    expect(html).toContain('function resetMainPriceScaleAutoScale(chart)');
    expect(html).toContain('priceScale.setAutoScale(true);');
    expect(html).toMatch(
      /chart\.resetData\(\);\s+resetMainPriceScaleAutoScale\(chart\);/,
    );
  });
});
