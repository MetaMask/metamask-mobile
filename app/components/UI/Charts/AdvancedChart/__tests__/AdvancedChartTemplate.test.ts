import { createAdvancedChartTemplate } from '../AdvancedChartTemplate';
import type { Theme } from '../../../../../util/theme/models';

jest.mock('../webview', () => ({
  chartLogicScript: '/* chart logic placeholder */',
}));

const mockTheme = {
  colors: {
    background: { default: '#1a1a2e' },
    border: { muted: '#2a2a3e' },
    text: { alternative: '#aaaaaa', muted: '#888888' },
    success: { default: '#28a745' },
    error: { default: '#dc3545' },
    primary: { default: '#037dd6' },
  },
} as unknown as Theme;

describe('createAdvancedChartTemplate', () => {
  it('returns valid HTML with theme colors injected', () => {
    const html = createAdvancedChartTemplate(mockTheme);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('#1a1a2e');
    expect(html).toContain('#28a745');
    expect(html).toContain('#dc3545');
    expect(html).toContain('#037dd6');
    expect(html).toContain('tv_chart_container');
    expect(html).toContain('chart logic placeholder');
  });

  it('injects CONFIG with libraryUrl', () => {
    const html = createAdvancedChartTemplate(mockTheme);

    expect(html).toContain('window.CONFIG');
    expect(html).toContain('libraryUrl');
    expect(html).toContain('charting_library');
  });

  it('sets enableDrawingTools feature when specified', () => {
    const html = createAdvancedChartTemplate(mockTheme, {
      enableDrawingTools: true,
    });

    expect(html).toContain('enableDrawingTools: true');
  });

  it('defaults enableDrawingTools to false', () => {
    const html = createAdvancedChartTemplate(mockTheme);

    expect(html).toContain('enableDrawingTools: false');
  });

  it('passes showVolume feature flag', () => {
    const htmlWithVolume = createAdvancedChartTemplate(mockTheme, {
      showVolume: true,
    });
    expect(htmlWithVolume).toContain('showVolume: true');

    const htmlWithoutVolume = createAdvancedChartTemplate(mockTheme, {
      showVolume: false,
    });
    expect(htmlWithoutVolume).toContain('showVolume: false');
  });

  it('includes loading overlay', () => {
    const html = createAdvancedChartTemplate(mockTheme);

    expect(html).toContain('loading-overlay');
    expect(html).toContain('Loading chart...');
  });
});
