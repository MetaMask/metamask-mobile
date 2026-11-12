import { getFontSizeForInputLength } from '../../../../../../component-library/components-temp/AnimatedAmountDisplay';
import { mockTheme } from '../../../../../../util/theme';
import { Theme } from '../../../../../../util/theme/models';
import styleSheet from './custom-amount.styles';

describe('custom-amount.styles', () => {
  it('sizes the amount from the shared input length scale', () => {
    const amountLength = 9;
    const fontSize = getFontSizeForInputLength(amountLength);

    const styles = styleSheet({
      theme: mockTheme as Theme,
      vars: {
        amountLength,
        hasAlert: false,
        disabled: false,
      },
    });

    expect(styles.input.fontSize).toBe(fontSize);
    expect(styles.input.lineHeight).toBe(fontSize);
  });
});
