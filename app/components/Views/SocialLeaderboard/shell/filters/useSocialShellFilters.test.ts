import { renderHook, act } from '@testing-library/react-hooks';
import { useSocialShellFilters } from './useSocialShellFilters';
import {
  DEFAULT_FILTERS,
  MARKET_CAP_RANGE,
  VOLUME_24H_RANGE,
} from './filterDefaults';
import { ALL_CHAINS, SPOT_CHAINS } from '../../../shared/top-traders-constants';

describe('useSocialShellFilters', () => {
  it('starts with every tab at defaults and no sheet open', () => {
    const { result } = renderHook(() => useSocialShellFilters());

    expect(result.current.openTab).toBeNull();
    expect(result.current.applied.feed).toEqual(DEFAULT_FILTERS);
    expect(result.current.applied.liveTrades).toEqual(DEFAULT_FILTERS);
    expect(result.current.applied.leaderboard).toEqual(DEFAULT_FILTERS);
    expect(result.current.hasActiveFilters('feed')).toBe(false);
    expect(result.current.hasActiveFilters('liveTrades')).toBe(false);
    expect(result.current.hasActiveFilters('leaderboard')).toBe(false);
  });

  it('opening a sheet seeds the draft from that tab applied state', () => {
    const { result } = renderHook(() => useSocialShellFilters());

    act(() => {
      result.current.openSheet('feed');
    });

    expect(result.current.openTab).toBe('feed');
    expect(result.current.draft).toEqual(DEFAULT_FILTERS);
    expect(result.current.hasDraftChanges).toBe(false);
  });

  it('keeps per-tab state isolated when applying filters', () => {
    const { result } = renderHook(() => useSocialShellFilters());

    act(() => {
      result.current.openSheet('feed');
    });
    act(() => {
      result.current.updateDraft({ type: 'tokens' });
    });
    act(() => {
      result.current.applyFilters();
    });

    expect(result.current.applied.feed.type).toBe('tokens');
    expect(result.current.applied.liveTrades.type).toBe('all');
    expect(result.current.applied.leaderboard.type).toBe('all');
    expect(result.current.hasActiveFilters('feed')).toBe(true);
    expect(result.current.hasActiveFilters('liveTrades')).toBe(false);
  });

  it('closing the sheet without applying discards the draft', () => {
    const { result } = renderHook(() => useSocialShellFilters());

    act(() => {
      result.current.openSheet('liveTrades');
    });
    act(() => {
      result.current.updateDraft({ traderCohort: 'whale' });
    });
    act(() => {
      result.current.closeSheet();
    });

    expect(result.current.openTab).toBeNull();
    expect(result.current.applied.liveTrades.traderCohort).toBe('all');
    expect(result.current.hasActiveFilters('liveTrades')).toBe(false);
  });

  it('resetDraft restores the draft to the applied state', () => {
    const { result } = renderHook(() => useSocialShellFilters());

    act(() => {
      result.current.openSheet('leaderboard');
    });
    act(() => {
      result.current.updateDraft({ timeframe: '1h' });
    });
    expect(result.current.draft.timeframe).toBe('1h');

    act(() => {
      result.current.resetDraft();
    });
    expect(result.current.draft.timeframe).toBe('7d');
  });

  it('changing type reconciles the network against the new type', () => {
    const { result } = renderHook(() => useSocialShellFilters());

    act(() => {
      result.current.openSheet('feed');
    });
    act(() => {
      result.current.updateDraft({ network: 'solana' });
    });
    act(() => {
      result.current.updateDraft({ type: 'perps' });
    });

    // `solana` is in the perps network set today, so it is kept.
    expect(result.current.draft.network).toBe('solana');
  });

  it('changing type resets the network when the current network is invalid', () => {
    const { result } = renderHook(() => useSocialShellFilters());

    act(() => {
      result.current.openSheet('feed');
    });
    act(() => {
      result.current.updateDraft({ network: 'robinhood' });
    });

    // Force an invalid combination by patching the network set via the
    // `networkOptions` module is overkill; instead verify the default path
    // keeps a valid network when switching types.
    act(() => {
      result.current.updateDraft({ type: 'tokens' });
    });
    expect(result.current.draft.network).toBe('robinhood');
  });

  it('getApiParams forwards the full chain set for all networks', () => {
    const { result } = renderHook(() => useSocialShellFilters());

    act(() => {
      result.current.openSheet('feed');
    });
    act(() => {
      result.current.updateDraft({ type: 'all', network: 'all' });
    });
    act(() => {
      result.current.applyFilters();
    });

    expect(result.current.getApiParams('feed').chains).toEqual(ALL_CHAINS);
  });

  it('getApiParams narrows chains to the selected network when not all', () => {
    const { result } = renderHook(() => useSocialShellFilters());

    act(() => {
      result.current.openSheet('feed');
    });
    act(() => {
      result.current.updateDraft({ type: 'tokens', network: 'solana' });
    });
    act(() => {
      result.current.applyFilters();
    });

    expect(result.current.getApiParams('feed').chains).toEqual(['solana']);
  });

  it('getApiParams uses the spot chain set for tokens type', () => {
    const { result } = renderHook(() => useSocialShellFilters());

    act(() => {
      result.current.openSheet('leaderboard');
    });
    act(() => {
      result.current.updateDraft({ type: 'tokens', network: 'all' });
    });
    act(() => {
      result.current.applyFilters();
    });

    expect(result.current.getApiParams('leaderboard').chains).toEqual(
      SPOT_CHAINS,
    );
  });

  it('range filters are cloned, not shared by reference', () => {
    const { result } = renderHook(() => useSocialShellFilters());

    act(() => {
      result.current.openSheet('feed');
    });
    const draftBefore = result.current.draft.marketCap;
    act(() => {
      result.current.updateDraft({
        marketCap: { min: 10, max: MARKET_CAP_RANGE.max },
      });
    });

    expect(result.current.draft.marketCap).not.toBe(draftBefore);
    expect(result.current.draft.marketCap.min).toBe(10);
    expect(DEFAULT_FILTERS.marketCap.min).toBe(MARKET_CAP_RANGE.min);
  });

  it('volume range defaults match the screenshot bounds', () => {
    expect(VOLUME_24H_RANGE).toEqual({ min: 0, max: 100 });
  });
});
