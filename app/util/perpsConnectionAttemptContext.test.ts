import {
  getPerpsConnectionAttemptContext,
  withPerpsConnectionAttemptContext,
} from './perpsConnectionAttemptContext';

describe('perpsConnectionAttemptContext', () => {
  it('returns null when no context is active', () => {
    expect(getPerpsConnectionAttemptContext()).toBeNull();
  });

  it('sets context during callback execution and restores it after', async () => {
    const context = { source: 'test_source', suppressError: true };

    await withPerpsConnectionAttemptContext(context, async () => {
      expect(getPerpsConnectionAttemptContext()).toEqual(context);
      return 'result';
    });

    expect(getPerpsConnectionAttemptContext()).toBeNull();
  });

  it('returns the callback result', async () => {
    const context = { source: 'test', suppressError: false };

    const result = await withPerpsConnectionAttemptContext(
      context,
      async () => 42,
    );

    expect(result).toBe(42);
  });

  it('restores previous context after nested calls', async () => {
    const outer = { source: 'outer', suppressError: false };
    const inner = { source: 'inner', suppressError: true };

    await withPerpsConnectionAttemptContext(outer, async () => {
      expect(getPerpsConnectionAttemptContext()).toEqual(outer);

      await withPerpsConnectionAttemptContext(inner, async () => {
        expect(getPerpsConnectionAttemptContext()).toEqual(inner);
      });

      // Outer context restored after inner completes
      expect(getPerpsConnectionAttemptContext()).toEqual(outer);
    });

    expect(getPerpsConnectionAttemptContext()).toBeNull();
  });

  it('restores context even when callback throws', async () => {
    const context = { source: 'failing', suppressError: false };

    await expect(
      withPerpsConnectionAttemptContext(context, async () => {
        throw new Error('callback error');
      }),
    ).rejects.toThrow('callback error');

    // Context should be restored to null despite the error
    expect(getPerpsConnectionAttemptContext()).toBeNull();
  });
});
