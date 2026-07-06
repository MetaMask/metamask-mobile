import { createAdvancedChartTemplate } from '../AdvancedChartTemplate';
import { mockTheme } from '../../../../../util/theme';

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
});
