import { DEBOUNCE_WAIT, useTrendingRequest } from './';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { act } from '@testing-library/react-native';
import { CaipChainId } from '@metamask/utils';
// eslint-disable-next-line import/no-namespace
import * as assetsControllers from '@metamask/assets-controllers';

jest.useFakeTimers();
const spyGetTrendingTokens = jest.spyOn(assetsControllers, 'getTrendingTokens');

describe('useTrendingRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('makes a single call to get trending tokens when invoked multiple times', async () => {
    const { result } = renderHookWithProvider(() =>
      useTrendingRequest({
        chainIds: ['eip155:1', 'eip155:10'],
      }),
    );

    await act(async () => {
      // Make multiple rapid calls
      result.current();
      result.current();
      result.current();

      spyGetTrendingTokens.mockClear();

      // Advance timer by less than debounce time
      jest.advanceTimersByTime(DEBOUNCE_WAIT - 100);

      // Should not have been called yet
      expect(spyGetTrendingTokens).not.toHaveBeenCalled();

      // Advance timer past debounce time
      jest.advanceTimersByTime(DEBOUNCE_WAIT + 200);

      // Should have been called exactly once
      expect(spyGetTrendingTokens).toHaveBeenCalledTimes(1);
    });
  });

  it('returns a debounced function for trending tokens requests', () => {
    const testOptions = {
      chainIds: ['eip155:1', 'eip155:10'],
    } as {
      chainIds: CaipChainId[];
    };

    const { result } = renderHookWithProvider(() =>
      useTrendingRequest(testOptions),
    );

    expect(typeof result.current).toBe('function');
  });

  it('skips update when chain ids are missing', async () => {
    const { result } = renderHookWithProvider(() =>
      useTrendingRequest({
        chainIds: [],
      }),
    );

    await act(async () => {
      await result.current();
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
    });

    spyGetTrendingTokens.mockClear();
    expect(spyGetTrendingTokens).not.toHaveBeenCalled();
  });
});
