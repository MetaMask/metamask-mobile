import { useBlinkingCursor as useSharedBlinkingCursor } from '../../../../component-library/components-temp/AnimatedAmountDisplay';
import { useBlinkingCursor } from './useBlinkingCursor';

describe('useBlinkingCursor', () => {
  it('re-exports the shared cursor hook', () => {
    expect(useBlinkingCursor).toBe(useSharedBlinkingCursor);
  });
});
