import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { hasMinimumRequiredVersion } from '../../../util/remoteFeatureFlag';

/**
 * Shape of the `rampsServiceDisruptionModal` remote feature flag.
 *
 * - `regions`: lowercase `regionCode`s currently in a service disruption. A country entry (`"in"`) blocks all of its states; a country-state entry (`"us-ca"`) blocks only that state. Missing/empty means the service disruption is off.
 * - `minimumVersion`: optional semver floor — the service disruption is only honored on native builds `>= minimumVersion`. Absent means it applies to every build that has the feature.
 */
export interface RampsServiceDisruptionConfig {
  regions?: string[];
  minimumVersion?: string;
}

/**
 * Region codes for which the Buy flow is currently in a service disruption, after applying
 * the optional minimum-version gate. Returns `[]` (service disruption off) when the flag is
 * missing, has no regions, or the current build is older than `minimumVersion`.
 *
 * Accepts either the object shape `{ regions, minimumVersion }` or a bare
 * `string[]` of regionCodes (back-compat; no version gate). Toggled remotely by
 * incident teams with no deploy.
 */
export const selectRampsServiceDisruptionRegions = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): string[] => {
    // The flag is either the object shape `{ regions, minimumVersion }` or a
    // bare `string[]` of regionCodes (back-compat; no version gate).
    const value = remoteFeatureFlags?.rampsServiceDisruptionModal as
      | string[]
      | RampsServiceDisruptionConfig
      | undefined;
    const rawRegions = Array.isArray(value) ? value : value?.regions;
    const regions = Array.isArray(rawRegions)
      ? rawRegions
          .filter((region): region is string => typeof region === 'string')
          .map((region) => region.toLowerCase().trim())
      : [];

    if (regions.length === 0) {
      return [];
    }

    // Version gate: ignore the service disruption on builds older than `minimumVersion`.
    // Absent minimumVersion => applies to every build that has the feature.
    const minimumVersion = Array.isArray(value)
      ? undefined
      : value?.minimumVersion;
    if (minimumVersion && !hasMinimumRequiredVersion(minimumVersion)) {
      return [];
    }

    return regions;
  },
);
