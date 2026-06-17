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

  it('uses Map APIs for RN-backed pending older-bar callbacks', () => {
    const html = createAdvancedChartTemplate(mockTheme);

    expect(html).toContain('window.pendingOlderBarsCallbacks = new Map();');
    expect(html).toContain(
      'window.pendingOlderBarsCallbacks.get(payload.requestId)',
    );
    expect(html).toContain(
      'window.pendingOlderBarsCallbacks.delete(payload.requestId)',
    );
    expect(html).toContain('window.pendingOlderBarsCallbacks.set(requestId, {');
  });
});
