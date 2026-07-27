import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PredictFeedConfig,
  PredictFeedId,
  PredictFeedTabConfig,
  resolvePredictFeedConfig,
} from '../constants/feedConfig';
import type {
  PredictFilterOptionsParams,
  PredictMarketListParams,
} from '../types';
import { usePredictFilterOptions } from './usePredictFilterOptions';

/** `'not-found'` when the route `feedId` is unknown (caller navigates home). */
export type PredictFeedConfigStatus = 'ready' | 'not-found';

/** Lifecycle of the active tab's dynamic (related-tags) filter chips. */
export type PredictDynamicFiltersStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'unavailable';

/**
 * Unified render shape so the view treats static + dynamic filters identically.
 * Static filters carry `titleKey` (i18n key); dynamic filters carry `label`
 * (already-localized API text). Resolve a chip label as
 * `titleKey ? strings(titleKey) : label`.
 */
export interface PredictFeedRenderFilter {
  /** Stable id/slug, used as the dedupe + selection key. */
  id: string;
  titleKey?: string;
  label?: string;
  /** Ready-to-use list params; feed straight into `usePredictMarketList`. */
  params: PredictMarketListParams;
  isDynamic: boolean;
}

export interface PredictFeedTabSummary {
  id: string;
  titleKey: string;
}

export interface UsePredictFeedConfigOptions {
  initialTabId?: string;
  initialFilterId?: string;
}

export interface PredictFeedConfigResult {
  status: PredictFeedConfigStatus;
  feedId?: PredictFeedId;
  titleKey?: string;
  header?: { showBackButton: boolean; showSearchButton: boolean };
  tabs: PredictFeedTabSummary[];
  /** Hidden for single-tab feeds; filters still render for that one tab. */
  showTabBar: boolean;
  /** Hidden when the active feed has no user-selectable filters. */
  showFilterBar: boolean;
  activeTabId?: string;
  setActiveTabId: (id: string) => void;
  /** Static + deduped dynamic filters for the active tab. */
  filters: PredictFeedRenderFilter[];
  dynamicFilters: { status: PredictDynamicFiltersStatus };
  activeFilterId?: string;
  setActiveFilterId: (id: string) => void;
  /** The resolved active filter; `.params` feeds `usePredictMarketList`. */
  activeFilter?: PredictFeedRenderFilter;
}

/**
 * Dynamic filters are best-effort and non-blocking. When a tab declares no
 * `filters.dynamic`, we still call `usePredictFilterOptions` (rules of hooks)
 * but disabled, with this throwaway params object so no fetch is issued.
 */
const DISABLED_FILTER_OPTIONS_PARAMS: PredictFilterOptionsParams = {
  source: 'related-tags',
};

const findTab = (
  config: PredictFeedConfig | undefined,
  tabId: string | undefined,
): PredictFeedTabConfig | undefined =>
  config?.tabs.find((tab) => tab.id === tabId) ?? config?.tabs[0];

const resolveInitialTabId = (
  config: PredictFeedConfig | undefined,
  initialTabId: string | undefined,
): string | undefined => {
  const tabs = config?.tabs ?? [];
  if (initialTabId && tabs.some((tab) => tab.id === initialTabId)) {
    return initialTabId;
  }
  return tabs[0]?.id;
};

/**
 * The filter we can select synchronously: only static filters (and the tab's
 * default) are known before dynamic filters resolve. A dynamic `initialFilterId`
 * is honored later, once it appears (see the late-resolution effect).
 */
const resolveInitialFilterId = (
  tab: PredictFeedTabConfig | undefined,
  initialFilterId: string | undefined,
): string | undefined => {
  if (
    initialFilterId &&
    tab?.filters.static.some((filter) => filter.id === initialFilterId)
  ) {
    return initialFilterId;
  }
  return tab?.defaultFilterId;
};

/** True when `initialFilterId` is set but not resolvable from static config. */
const isPendingDynamicFilter = (
  tab: PredictFeedTabConfig | undefined,
  initialFilterId: string | undefined,
): boolean =>
  Boolean(
    initialFilterId &&
      !tab?.filters.static.some((filter) => filter.id === initialFilterId),
  );

/**
 * Resolves a route `feedId` into a render-ready feed config by combining the
 * static `PREDICT_FEED_REGISTRY` shell with runtime dynamic (related-tags)
 * filters. Owns the active tab/filter selection state so the consuming view
 * (`PredictFeedView`) stays presentational.
 *
 * Unknown `feedId` resolves to `status: 'not-found'` so the view can navigate
 * home. Static/default filters are usable immediately; dynamic filters hydrate
 * asynchronously via `usePredictFilterOptions`, are deduped against static by
 * id/slug, and on failure leave the static filters in place with
 * `dynamicFilters.status: 'unavailable'`. A dynamic `initialFilterId` is
 * selected once it appears; otherwise selection falls back to the tab default.
 */
export const usePredictFeedConfig = (
  feedId?: string,
  options: UsePredictFeedConfigOptions = {},
): PredictFeedConfigResult => {
  const { initialTabId, initialFilterId } = options;

  const config = useMemo(() => resolvePredictFeedConfig(feedId), [feedId]);

  const [activeTabId, setActiveTabIdState] = useState<string | undefined>(() =>
    resolveInitialTabId(config, initialTabId),
  );
  const [activeFilterId, setActiveFilterIdState] = useState<string | undefined>(
    () =>
      resolveInitialFilterId(
        findTab(config, resolveInitialTabId(config, initialTabId)),
        initialFilterId,
      ),
  );

  // The route's `initialFilterId` when it targets a (not-yet-loaded) dynamic
  // filter; consumed once dynamic filters resolve, then cleared. Manual
  // tab/filter changes cancel it. Seeded once at mount (the re-init effect
  // below re-seeds it on route-param changes).
  const pendingDynamicFilterIdRef = useRef<string | undefined>(undefined);
  const didSeedPendingRef = useRef(false);
  if (!didSeedPendingRef.current) {
    didSeedPendingRef.current = true;
    const initialTab = findTab(
      config,
      resolveInitialTabId(config, initialTabId),
    );
    pendingDynamicFilterIdRef.current = isPendingDynamicFilter(
      initialTab,
      initialFilterId,
    )
      ? initialFilterId
      : undefined;
  }

  const activeTab = useMemo(
    () => findTab(config, activeTabId),
    [config, activeTabId],
  );

  const staticFilters = useMemo<PredictFeedRenderFilter[]>(
    () =>
      (activeTab?.filters.static ?? []).map((filter) => ({
        id: filter.id,
        titleKey: filter.titleKey,
        label: filter.label,
        params: filter.params,
        isDynamic: false,
      })),
    [activeTab],
  );

  const dynamicConfig = activeTab?.filters.dynamic;
  const dynamicParams = useMemo<PredictFilterOptionsParams | undefined>(
    () =>
      dynamicConfig
        ? {
            source: dynamicConfig.source,
            baseTagSlug: dynamicConfig.baseTagSlug,
            baseParams: dynamicConfig.baseParams,
            limit: dynamicConfig.limit,
          }
        : undefined,
    [dynamicConfig],
  );

  const {
    filterOptions: dynamicOptions,
    isLoading: isDynamicLoading,
    error: dynamicError,
  } = usePredictFilterOptions(dynamicParams ?? DISABLED_FILTER_OPTIONS_PARAMS, {
    enabled: Boolean(dynamicParams),
  });

  const staticFilterIds = useMemo(
    () => new Set(staticFilters.map((filter) => filter.id)),
    [staticFilters],
  );

  const dynamicFilters = useMemo<PredictFeedRenderFilter[]>(() => {
    if (!dynamicParams) {
      return [];
    }
    return dynamicOptions
      .filter((option) => !staticFilterIds.has(option.id))
      .map((option) => ({
        id: option.id,
        label: option.label,
        params: option.params,
        isDynamic: true,
      }));
  }, [dynamicParams, dynamicOptions, staticFilterIds]);

  const filters = useMemo<PredictFeedRenderFilter[]>(
    () => [...staticFilters, ...dynamicFilters],
    [staticFilters, dynamicFilters],
  );

  const dynamicStatus = useMemo<PredictDynamicFiltersStatus>(() => {
    if (!dynamicParams) {
      return 'idle';
    }
    if (isDynamicLoading) {
      return 'loading';
    }
    // A fetch error and a successful-but-empty related-tags list are
    // intentionally collapsed: both simply hide the dynamic chips.
    if (dynamicError || dynamicOptions.length === 0) {
      return 'unavailable';
    }
    return 'ready';
  }, [dynamicParams, isDynamicLoading, dynamicError, dynamicOptions.length]);

  // Re-initialize selection when any route input changes (the feed itself, or
  // the initial tab/filter on the same feed) so a reused screen instance honors
  // updated deeplink/navigation params. Skipped on mount (state is already
  // seeded by the lazy initializers above). These are primitive route inputs,
  // not user gestures, so re-seeding on a value change is intentional.
  const seedKey = [feedId, initialTabId, initialFilterId].join('\u0000');
  const previousSeedKeyRef = useRef(seedKey);
  useEffect(() => {
    if (previousSeedKeyRef.current === seedKey) {
      return;
    }
    previousSeedKeyRef.current = seedKey;

    const nextConfig = resolvePredictFeedConfig(feedId);
    const nextTabId = resolveInitialTabId(nextConfig, initialTabId);
    const nextTab = findTab(nextConfig, nextTabId);

    setActiveTabIdState(nextTabId);
    setActiveFilterIdState(resolveInitialFilterId(nextTab, initialFilterId));
    pendingDynamicFilterIdRef.current = isPendingDynamicFilter(
      nextTab,
      initialFilterId,
    )
      ? initialFilterId
      : undefined;
  }, [seedKey, feedId, initialTabId, initialFilterId]);

  // Honor a dynamic `initialFilterId` once dynamic filters settle. If the
  // target never appears (or the load fails), keep the current default.
  useEffect(() => {
    const pending = pendingDynamicFilterIdRef.current;
    if (!pending || dynamicStatus === 'loading') {
      return;
    }
    if (filters.some((filter) => filter.id === pending)) {
      setActiveFilterIdState(pending);
    }
    pendingDynamicFilterIdRef.current = undefined;
  }, [dynamicStatus, filters]);

  const setActiveTabId = useCallback(
    (id: string) => {
      // Resolve before storing so `activeTabId` always matches `activeTab`
      // (which falls back to the first tab); ignore unknown ids.
      const nextTab = findTab(config, id);
      if (!nextTab) {
        return;
      }
      pendingDynamicFilterIdRef.current = undefined;
      setActiveTabIdState(nextTab.id);
      setActiveFilterIdState(nextTab.defaultFilterId);
    },
    [config],
  );

  const setActiveFilterId = useCallback(
    (id: string) => {
      // Ignore ids absent from the active tab's filters so the highlighted chip
      // can't diverge from the rendered `activeFilter`/list.
      if (!filters.some((filter) => filter.id === id)) {
        return;
      }
      pendingDynamicFilterIdRef.current = undefined;
      setActiveFilterIdState(id);
    },
    [filters],
  );

  const activeFilter = useMemo<PredictFeedRenderFilter | undefined>(
    () =>
      filters.find((filter) => filter.id === activeFilterId) ??
      filters.find((filter) => filter.id === activeTab?.defaultFilterId) ??
      filters[0],
    [filters, activeFilterId, activeTab],
  );

  const tabs = useMemo<PredictFeedTabSummary[]>(
    () =>
      (config?.tabs ?? []).map((tab) => ({
        id: tab.id,
        titleKey: tab.titleKey,
      })),
    [config],
  );

  const dynamicFiltersInfo = useMemo(
    () => ({ status: dynamicStatus }),
    [dynamicStatus],
  );

  // Expose the *resolved* selection ids so the public values always agree with
  // the rendered content. `activeTab`/`activeFilter` reconcile via `findTab`/
  // fallback every render, whereas the underlying state is only re-seeded by the
  // effect a tick later — so on a `feedId` change the raw state can briefly hold
  // the previous feed's (now-invalid) ids. Deriving from the resolved values
  // removes that transient disagreement.
  const resolvedActiveTabId = activeTab?.id ?? activeTabId;
  const resolvedActiveFilterId = activeFilter?.id ?? activeFilterId;

  return {
    status: config ? 'ready' : 'not-found',
    feedId: config?.id,
    titleKey: config?.titleKey,
    header: config?.header,
    tabs,
    showTabBar: tabs.length > 1,
    showFilterBar: config?.showFilterBar ?? true,
    activeTabId: resolvedActiveTabId,
    setActiveTabId,
    filters,
    dynamicFilters: dynamicFiltersInfo,
    activeFilterId: resolvedActiveFilterId,
    setActiveFilterId,
    activeFilter,
  };
};
