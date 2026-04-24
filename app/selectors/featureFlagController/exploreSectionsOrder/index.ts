import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import type { SectionId } from '../../../components/Views/TrendingView/sections.config';

const VALID_SECTION_IDS: ReadonlySet<string> = new Set<SectionId>([
  'predictions',
  'tokens',
  'perps',
  'stocks',
  'sites',
]);

export interface ExploreSectionsOrderConfig {
  home: SectionId[];
  quickActions: SectionId[];
  search: SectionId[];
}

const isValidSectionIdArray = (arr: unknown): arr is SectionId[] =>
  Array.isArray(arr) &&
  arr.length > 0 &&
  new Set(arr).size === arr.length &&
  arr.every((id) => typeof id === 'string' && VALID_SECTION_IDS.has(id));

/**
 * Unwraps a flag value that may be wrapped in a progressive rollout shape
 * `{ name?: string, value: ... }`.
 */
const unwrapFlagValue = (flag: unknown): unknown => {
  if (
    typeof flag === 'object' &&
    flag !== null &&
    'value' in flag &&
    !('home' in flag)
  ) {
    return (flag as { value: unknown }).value;
  }
  return flag;
};

/**
 * Reads the `exploreSectionsOrder` remote feature flag.
 *
 * Expected LaunchDarkly JSON shape:
 * ```json
 * {
 *   "home": ["predictions", "tokens", "perps", "stocks", "sites"],
 *   "quickActions": ["tokens", "perps", "stocks", "predictions", "sites"],
 *   "search": ["tokens", "perps", "stocks", "predictions", "sites"]
 * }
 * ```
 *
 * Returns `null` when the flag is absent or invalid, letting callers
 * fall back to hardcoded defaults.
 */
export const selectExploreSectionsOrder = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): ExploreSectionsOrderConfig | null => {
    const raw = remoteFeatureFlags?.exploreSectionsOrder;
    if (!raw) return null;

    const flag = unwrapFlagValue(raw);
    if (!flag || typeof flag !== 'object') return null;

    const { home, quickActions, search } = flag as Record<string, unknown>;

    if (
      !isValidSectionIdArray(home) ||
      !isValidSectionIdArray(quickActions) ||
      !isValidSectionIdArray(search)
    ) {
      return null;
    }

    return { home, quickActions, search };
  },
);
