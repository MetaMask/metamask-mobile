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

const filtersEqual = (a: SocialShellFilters, b: SocialShellFilters): boolean =>
  a.type === b.type &&
  a.traderCohort === b.traderCohort &&
  a.timeframe === b.timeframe &&
  a.network === b.network &&
  a.marketCap.min === b.marketCap.min &&
  a.marketCap.max === b.marketCap.max &&
  a.volume24h.min === b.volume24h.min &&
  a.volume24h.max === b.volume24h.max;

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
  /** Resets the open tab's draft back to its applied state. */
  resetDraft: () => void;
}

/**
 * Per-tab filter state for the Social Bundle V1 unified Filters sheet.
 *
 * Each tab keeps its own `applied` + `draft` pair. Opening the sheet copies
 * `applied → draft`; closing without applying discards the draft. "Show
 * results" commits the draft to `applied` and closes the sheet.
 *
 * The hook is deliberately decoupled from any fetch layer — `getApiParams`
 * exposes API-ready params via `mapFiltersToApiParams` so the V1 lists can
 * consume them once they ship.
 */
export function useSocialShellFilters(): UseSocialShellFiltersResult {
  const [applied, setApplied] = useState<
    Record<SocialShellTab, SocialShellFilters>
  >(() => ({
    feed: cloneFilters(DEFAULT_TAB_FILTER_STATE.feed),
    liveTrades: cloneFilters(DEFAULT_TAB_FILTER_STATE.liveTrades),
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
      // Keep network valid for the new type. The sheet calls `updateDraft`
      // with `{ type }` when the user taps a Type chip; we reconcile the
      // network here so the rest of the sheet never has to. When the patch
      // also includes a `network`, validate that against the new type
      // instead of the previous network.
      if (patch.type && patch.type !== prev.type) {
        const candidateNetwork = patch.network ?? prev.network;
        next.network = resolveNetworkForType(next.type, candidateNetwork);
      }
      return next;
    });
  }, []);

  const resetDraft = useCallback(() => {
    if (!openTab) {
      return;
    }
    setDraft(cloneFilters(applied[openTab]));
  }, [applied, openTab]);

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
    (tab: SocialShellTab) => !filtersEqual(applied[tab], DEFAULT_FILTERS),
    [applied],
  );

  const getApiParams = useCallback(
    (tab: SocialShellTab) => mapFiltersToApiParams(applied[tab]),
    [applied],
  );

  const hasDraftChanges = useMemo(
    () => (openTab ? !filtersEqual(draft, applied[openTab]) : false),
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
    resetDraft,
  };
}
