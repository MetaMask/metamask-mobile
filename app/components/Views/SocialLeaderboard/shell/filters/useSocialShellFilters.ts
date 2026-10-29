import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_FILTERS, DEFAULT_TAB_FILTER_STATE } from './filterDefaults';
import { resolveNetworkForType } from './networkOptions';
import { mapFiltersToApiParams } from './mapFiltersToApiParams';
import type { SocialFilterApiParams, SocialShellFilters } from './types';
import type { SocialShellTab } from '../types';

const cloneFilters = (filters: SocialShellFilters): SocialShellFilters => ({
  ...filters,
  marketCap: { ...filters.marketCap },
  volume24h: { ...filters.volume24h },
});

const rangesEqual = (
  a: SocialShellFilters['marketCap'],
  b: SocialShellFilters['marketCap'],
) => a.min === b.min && a.max === b.max;

/**
 * Compares only the fields a tab can edit, so the leaderboard's chip-owned
 * asset type and leftover hidden values do not light the filter icon.
 */
const tabFiltersEqual = (
  tab: SocialShellTab,
  a: SocialShellFilters,
  b: SocialShellFilters,
): boolean => {
  const cohortA = a.traderCohort === 'verified' ? 'all' : a.traderCohort;
  const cohortB = b.traderCohort === 'verified' ? 'all' : b.traderCohort;
  if ((tab !== 'leaderboard' && a.type !== b.type) || cohortA !== cohortB) {
    return false;
  }
  // Positions is a Trending section. Other tabs keep the default and must
  // not light their icon if a leftover value is still on the model.
  if (tab === 'trending' && a.positionStatus !== b.positionStatus) {
    return false;
  }
  if (tab === 'leaderboard') {
    return a.timeframe === b.timeframe;
  }
  // Verification and 24h volume are hidden until the API can honor them, so
  // leftover values must not light the filter icon.
  return rangesEqual(a.marketCap, b.marketCap);
};

export interface UseSocialShellFiltersResult {
  /** The tab whose sheet is currently open, or `null` when closed. */
  openTab: SocialShellTab | null;
  /** Draft filters for the open tab (or the last open tab when closed). */
  draft: SocialShellFilters;
  /** Applied filters per tab. */
  applied: Record<SocialShellTab, SocialShellFilters>;
  /** True when the open tab's draft has changes vs its applied state. */
  hasDraftChanges: boolean;
  /** True when the given tab's applied filters differ from defaults. */
  hasActiveFilters: (tab: SocialShellTab) => boolean;
  /** API-ready params for the given tab's applied filters. */
  getApiParams: (tab: SocialShellTab) => SocialFilterApiParams;
  openSheet: (tab: SocialShellTab) => void;
  closeSheet: () => void;
  updateDraft: (patch: Partial<SocialShellFilters>) => void;
  /** Applies the draft to the open tab and closes the sheet. */
  applyFilters: () => void;
  /** Resets sheet-owned fields to defaults. Apply still required to commit. */
  resetDraftToDefaults: () => void;
  /** Clears a tab's applied filters. The leaderboard type chip is kept. */
  clearAppliedFilters: (tab: SocialShellTab) => void;
  /** Updates the leaderboard asset type owned by the chip outside the sheet. */
  setLeaderboardType: (type: SocialShellFilters['type']) => void;
}

/**
 * Per-tab filter state for the Social Bundle V1 unified Filters sheet.
 *
 * Each tab keeps its own `applied` + `draft` pair. Opening the sheet copies
 * `applied → draft`; closing without applying discards the draft. Apply
 * commits the draft to `applied` and closes the sheet.
 */
export function useSocialShellFilters(): UseSocialShellFiltersResult {
  const [applied, setApplied] = useState<
    Record<SocialShellTab, SocialShellFilters>
  >(() => ({
    trending: cloneFilters(DEFAULT_TAB_FILTER_STATE.trending),
    following: cloneFilters(DEFAULT_TAB_FILTER_STATE.following),
    live: cloneFilters(DEFAULT_TAB_FILTER_STATE.live),
    leaderboard: cloneFilters(DEFAULT_TAB_FILTER_STATE.leaderboard),
  }));
  const [openTab, setOpenTab] = useState<SocialShellTab | null>(null);
  const [draft, setDraft] = useState<SocialShellFilters>(() =>
    cloneFilters(DEFAULT_FILTERS),
  );

  const openSheet = useCallback(
    (tab: SocialShellTab) => {
      setDraft(cloneFilters(applied[tab]));
      setOpenTab(tab);
    },
    [applied],
  );

  const closeSheet = useCallback(() => {
    setOpenTab(null);
  }, []);

  const updateDraft = useCallback((patch: Partial<SocialShellFilters>) => {
    setDraft((prev) => {
      const next: SocialShellFilters = { ...prev, ...patch };
      if (patch.type && patch.type !== prev.type) {
        const candidateNetwork = patch.network ?? prev.network;
        next.network = resolveNetworkForType(next.type, candidateNetwork);
      }
      return next;
    });
  }, []);

  const resetDraftToDefaults = useCallback(() => {
    if (!openTab) {
      return;
    }
    const resetFilters = cloneFilters(DEFAULT_FILTERS);
    if (openTab === 'leaderboard') {
      resetFilters.type = draft.type;
    }
    setDraft(resetFilters);
  }, [draft.type, openTab]);

  const setLeaderboardType = useCallback((type: SocialShellFilters['type']) => {
    setApplied((prev) => ({
      ...prev,
      leaderboard: {
        ...prev.leaderboard,
        type,
      },
    }));
  }, []);

  const clearAppliedFilters = useCallback((tab: SocialShellTab) => {
    setApplied((prev) => {
      const resetFilters = cloneFilters(DEFAULT_FILTERS);
      if (tab === 'leaderboard') {
        resetFilters.type = prev.leaderboard.type;
      }
      return {
        ...prev,
        [tab]: resetFilters,
      };
    });
  }, []);

  const applyFilters = useCallback(() => {
    if (!openTab) {
      return;
    }
    setApplied((prev) => ({
      ...prev,
      [openTab]: cloneFilters(draft),
    }));
    setOpenTab(null);
  }, [draft, openTab]);

  const hasActiveFilters = useCallback(
    (tab: SocialShellTab) =>
      !tabFiltersEqual(tab, applied[tab], DEFAULT_FILTERS),
    [applied],
  );

  const getApiParams = useCallback(
    (tab: SocialShellTab) => mapFiltersToApiParams(applied[tab]),
    [applied],
  );

  const hasDraftChanges = useMemo(
    () =>
      openTab ? !tabFiltersEqual(openTab, draft, applied[openTab]) : false,
    [draft, applied, openTab],
  );

  return {
    openTab,
    draft,
    applied,
    hasDraftChanges,
    hasActiveFilters,
    getApiParams,
    openSheet,
    closeSheet,
    updateDraft,
    applyFilters,
    resetDraftToDefaults,
    clearAppliedFilters,
    setLeaderboardType,
  };
}
