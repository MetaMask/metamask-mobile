import { Platform } from 'react-native';
import { mockTheme } from '../../../../../util/theme';
import { Theme } from '../../../../../util/theme/models';
import styleSheet from './BuildQuote.styles';

describe('BuildQuote.styles', () => {
  it('sizes the cursor to 95% of the amount and uses the muted color', () => {
    const styles = styleSheet({
      theme: mockTheme as Theme,
      vars: { amountFontSize: 60 },
    });

    expect(styles.cursor.width).toBe(1);
    expect(styles.cursor.height).toBe(57);
    expect(styles.cursor.backgroundColor).toBe(mockTheme.colors.text.muted);
  });

  it.each([
    ['ios', -2],
    ['android', 1],
  ] as const)(
    'offsets the cursor to center it on the digits on %s',
    (os, expectedTranslateY) => {
      jest.replaceProperty(Platform, 'OS', os);

      const styles = styleSheet({
        theme: mockTheme as Theme,
        vars: { amountFontSize: 60 },
      });

      expect(styles.cursor.transform).toEqual([
        { translateY: expectedTranslateY },
      ]);
    },
  );
});
