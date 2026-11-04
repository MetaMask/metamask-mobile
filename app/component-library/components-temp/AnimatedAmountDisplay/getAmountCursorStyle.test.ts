import { Platform } from 'react-native';

import { mockTheme } from '../../../util/theme';
import { getAmountCursorStyle } from './getAmountCursorStyle';

describe('getAmountCursorStyle', () => {
  it.each([
    ['ios', -4],
    ['android', 2],
  ] as const)(
    'returns a cursor sized to the digits on %s',
    (os, expectedTranslateY) => {
      jest.replaceProperty(Platform, 'OS', os);

      const color = mockTheme.colors.text.muted;

      const style = getAmountCursorStyle(88, color);

      expect(style).toEqual({
        width: 1,
        backgroundColor: color,
        height: 84,
        transform: [{ translateY: expectedTranslateY }],
      });
    },
  );
});
