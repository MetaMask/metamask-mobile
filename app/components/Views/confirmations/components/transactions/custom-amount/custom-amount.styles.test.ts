import { mockTheme } from '../../../../../../util/theme';
import {
  getFontSizeForInputLength,
  default as styleSheet,
} from './custom-amount.styles';

describe('custom-amount styles', () => {
  it('smoothly scales and bounds the font size', () => {
    expect(getFontSizeForInputLength(8)).toBe(64);
    expect(getFontSizeForInputLength(9)).toBe(57);
    expect(getFontSizeForInputLength(14)).toBe(24);
    expect(getFontSizeForInputLength(15)).toBe(22);
    expect(getFontSizeForInputLength(20)).toBe(12);
    expect(getFontSizeForInputLength(40)).toBe(12);
  });

  it('constrains the per-glyph row to the available width', () => {
    const styles = styleSheet({
      theme: mockTheme,
      vars: { amountLength: 40, disabled: false, hasAlert: false },
    });

    expect(styles.displayContainer).toEqual(
      expect.objectContaining({
        maxWidth: '100%',
        paddingHorizontal: 24,
      }),
    );
    expect(styles.amount).toEqual(expect.objectContaining({ flexShrink: 1 }));
    expect(styles.input.fontSize).toBe(12);
  });
});
