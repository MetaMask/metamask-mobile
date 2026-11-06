import { Platform } from 'react-native';
import { renderHook } from '@testing-library/react-native';

import { mockTheme } from '../../../util/theme';
import { useAmountCursorStyle } from './useAmountCursorStyle';

describe('useAmountCursorStyle', () => {
  it.each([
    ['ios', -4],
    ['android', 2],
  ] as const)(
    'returns a muted cursor sized to the digits on %s',
    (os, expectedTranslateY) => {
      jest.replaceProperty(Platform, 'OS', os);

      const { result } = renderHook(() => useAmountCursorStyle(88));

      expect(result.current).toEqual({
        width: 1,
        backgroundColor: mockTheme.colors.text.muted,
        height: 84,
        transform: [{ translateY: expectedTranslateY }],
      });
    },
  );
});
