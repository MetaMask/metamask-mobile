import { renderHook } from '@testing-library/react-native';
import { useResetOnResolvedKind } from './useResetOnResolvedKind';

describe('useResetOnResolvedKind', () => {
  it('does not reset when kind is undefined', () => {
    const reset = jest.fn();

    renderHook(() => useResetOnResolvedKind(undefined, reset));

    expect(reset).not.toHaveBeenCalled();
  });

  it('resets once when a non-null kind first appears', () => {
    const reset = jest.fn();

    const { rerender } = renderHook(
      ({ kind }: { kind: 'unresolved' | undefined }) =>
        useResetOnResolvedKind(kind, reset),
      { initialProps: { kind: undefined as 'unresolved' | undefined } },
    );

    expect(reset).not.toHaveBeenCalled();

    rerender({ kind: 'unresolved' });

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('skips reset when kind goes unresolved -> undefined -> unresolved', () => {
    const reset = jest.fn();

    const { rerender } = renderHook(
      ({ kind }: { kind: 'unresolved' | undefined }) =>
        useResetOnResolvedKind(kind, reset),
      { initialProps: { kind: 'unresolved' as 'unresolved' | undefined } },
    );

    expect(reset).toHaveBeenCalledTimes(1);
    reset.mockClear();

    // Simulate useCardSignIn nulling resolution at the start of a re-resolve.
    rerender({ kind: undefined });
    expect(reset).not.toHaveBeenCalled();

    rerender({ kind: 'unresolved' });
    expect(reset).not.toHaveBeenCalled();
  });

  it('resets when kind changes to a different non-null value', () => {
    const reset = jest.fn();

    const { rerender } = renderHook(
      ({ kind }: { kind: 'unresolved' | 'email' | undefined }) =>
        useResetOnResolvedKind(kind, reset),
      {
        initialProps: {
          kind: 'unresolved' as 'unresolved' | 'email' | undefined,
        },
      },
    );

    expect(reset).toHaveBeenCalledTimes(1);
    reset.mockClear();

    rerender({ kind: undefined });
    rerender({ kind: 'email' });

    expect(reset).toHaveBeenCalledTimes(1);
  });
});
