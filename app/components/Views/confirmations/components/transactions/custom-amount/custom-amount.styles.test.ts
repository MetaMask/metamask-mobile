import { Platform } from 'react-native';
import { mockTheme } from '../../../../../../util/theme';
import { Theme } from '../../../../../../util/theme/models';
import styleSheet, {
  getFontSizeForConfirmationAmount,
} from './custom-amount.styles';

describe('custom-amount.styles', () => {
  it.each([
    [8, 88],
    [9, 40],
    [13, 40],
    [14, 30],
    [18, 30],
    [19, 20],
  ])(
    'uses the confirmation font size breakpoint for length %i',
    (length, expectedFontSize) => {
      expect(getFontSizeForConfirmationAmount(length)).toBe(expectedFontSize);
    },
  );

  it('uses the raw amount length without adding affix characters', () => {
    const styles = styleSheet({
      theme: mockTheme as Theme,
      vars: {
        amountLength: 9,
        hasAlert: false,
        disabled: false,
      },
    });

    expect(styles.input.fontSize).toBe(40);
    expect(styles.input.lineHeight).toBe(40);
    expect(styles.cursor.height).toBe(38);
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
