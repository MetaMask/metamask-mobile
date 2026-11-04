import { Platform } from 'react-native';

import { getAmountCursorStyle } from './getAmountCursorStyle';

describe('getAmountCursorStyle', () => {
  it.each([
    ['ios', -4],
    ['android', 2],
  ] as const)(
    'returns a cursor sized to the digits on %s',
    (os, expectedTranslateY) => {
      jest.replaceProperty(Platform, 'OS', os);

      const style = getAmountCursorStyle(88);

      expect(style).toEqual({
        height: 84,
        transform: [{ translateY: expectedTranslateY }],
      });
    },
  );
});
