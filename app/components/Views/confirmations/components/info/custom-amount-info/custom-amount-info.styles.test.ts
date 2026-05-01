import { mockTheme } from '../../../../../../util/theme';
import { Theme } from '../../../../../../util/theme/models';
import styleSheet from './custom-amount-info.styles';

describe('custom-amount-info.styles', () => {
  it('uses the theme muted border color for the separator', () => {
    const styles = styleSheet({ theme: mockTheme as Theme });

    expect(styles.separator.borderBottomWidth).toBe(1);
    expect(styles.separator.borderBottomColor).toBe(
      mockTheme.colors.border.muted,
    );
  });
});
