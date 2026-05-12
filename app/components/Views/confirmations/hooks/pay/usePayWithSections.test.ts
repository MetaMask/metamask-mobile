import { renderHook } from '@testing-library/react-hooks';
import { usePayWithSections } from './usePayWithSections';

describe('usePayWithSections', () => {
  it('returns empty sections array as skeleton', () => {
    const { result } = renderHook(() => usePayWithSections());

    expect(result.current.sections).toEqual([]);
  });

  it('returns the same sections reference across renders', () => {
    const { result, rerender } = renderHook(() => usePayWithSections());
    const first = result.current.sections;

    rerender();

    expect(result.current.sections).toBe(first);
  });
});
