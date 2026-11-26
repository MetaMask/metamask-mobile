import { Platform } from 'react-native';
import { getFontSizeForInputLength } from '../../../../../../component-library/components-temp/AnimatedAmountDisplay';
import { mockTheme } from '../../../../../../util/theme';
import { Theme } from '../../../../../../util/theme/models';
import styleSheet from './custom-amount.styles';

describe('custom-amount.styles', () => {
  it('sizes the amount and cursor from the shared input length scale', () => {
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
    expect(styles.cursor.height).toBe(Math.round(fontSize * 0.95));
  });

  it.each([
    ['ios', -4],
    ['android', 2],
  ] as const)(
    'offsets the cursor to center it on the digits on %s',
    (os, expectedTranslateY) => {
      jest.replaceProperty(Platform, 'OS', os);

      const styles = styleSheet({
        theme: mockTheme as Theme,
        vars: { amountLength: 8, hasAlert: false, disabled: false },
      });

      expect(styles.cursor.transform).toEqual([
        { translateY: expectedTranslateY },
      ]);
    },
  );
});
