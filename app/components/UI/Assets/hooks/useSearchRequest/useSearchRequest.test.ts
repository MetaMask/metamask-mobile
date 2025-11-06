import { DEBOUNCE_WAIT, useSearchRequest } from './';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { act } from '@testing-library/react-native';
import { CaipChainId } from '@metamask/utils';
// eslint-disable-next-line import/no-namespace
import * as assetsControllers from '@metamask/assets-controllers';

jest.useFakeTimers();
const spySearchTokens = jest.spyOn(assetsControllers, 'searchTokens');

describe('useSearchRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('makes a single call to search tokens when invoked multiple times', async () => {
    const { result } = renderHookWithProvider(() =>
      useSearchRequest({
        chainIds: ['eip155:1', 'eip155:10'],
        query: 'ETH',
        limit: 10,
      }),
    );

    await act(async () => {
      // Make multiple rapid calls
      result.current();
      result.current();
      result.current();

      spySearchTokens.mockClear();

      // Advance timer by less than debounce time
      jest.advanceTimersByTime(DEBOUNCE_WAIT - 100);

      // Should not have been called yet
      expect(spySearchTokens).not.toHaveBeenCalled();

      // Advance timer past debounce time
      jest.advanceTimersByTime(DEBOUNCE_WAIT + 200);

      // Should have been called exactly once
      expect(spySearchTokens).toHaveBeenCalledTimes(1);
    });
  });

  it('returns a debounced function for search tokens requests', () => {
    const testOptions = {
      chainIds: ['eip155:1', 'eip155:10'],
      query: 'ETH',
      limit: 10,
    } as {
      chainIds: CaipChainId[];
      query: string;
      limit: number;
    };

    const { result } = renderHookWithProvider(() =>
      useSearchRequest(testOptions),
    );

    expect(typeof result.current).toBe('function');
  });

  it('skips update when query is missing', async () => {
    const { result } = renderHookWithProvider(() =>
      useSearchRequest({
        chainIds: ['eip155:1', 'eip155:10'],
        query: '',
        limit: 10,
      }),
    );

    await act(async () => {
      await result.current();
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
    });

    expect(spySearchTokens).not.toHaveBeenCalled();
  });

  it('maintains stable debounced function reference when chainIds array reference changes but values remain the same', () => {
    let chainIds: CaipChainId[] = ['eip155:1', 'eip155:10'];
    const { result, rerender } = renderHookWithProvider(() =>
      useSearchRequest({
        chainIds,
        query: 'ETH',
        limit: 10,
      }),
    );

    const firstDebouncedFunction = result.current;

    // Rerender with same array values but different reference
    chainIds = ['eip155:1', 'eip155:10'];
    rerender(undefined);

    // The debounced function should remain the same reference
    // because the array values are identical
    expect(result.current).toBe(firstDebouncedFunction);
  });

  it('creates new debounced function when chainIds values change', () => {
    let chainIds: CaipChainId[] = ['eip155:1', 'eip155:10'];
    const { result, rerender } = renderHookWithProvider(() =>
      useSearchRequest({
        chainIds,
        query: 'ETH',
        limit: 10,
      }),
    );

    const firstDebouncedFunction = result.current;

    // Rerender with different array values
    chainIds = ['eip155:1', 'eip155:137'];
    rerender(undefined);

    // The debounced function should be a new reference
    // because the array values changed
    expect(result.current).not.toBe(firstDebouncedFunction);
  });
});
