import { Platform } from 'react-native';
import { mockTheme } from '../../../../../../util/theme';
import { Theme } from '../../../../../../util/theme/models';
import { styleSheet } from './amount.styles';

describe('amount.styles', () => {
  it.each([
    ['ios', -4],
    ['android', 2],
  ] as const)(
    'offsets the cursor to center it on the digits on %s',
    (os, expectedTranslateY) => {
      jest.replaceProperty(Platform, 'OS', os);

      const styles = styleSheet({
        theme: mockTheme as Theme,
        vars: { inputFontSize: 88 },
      });

      expect(styles.cursor.transform).toEqual([
        { translateY: expectedTranslateY },
      ]);
    },
  );
});
