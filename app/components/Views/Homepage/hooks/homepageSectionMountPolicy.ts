import type { HardwareTier } from '../../../../util/deviceCapability';
import type { NetworkTier } from '../../../../util/deviceCapability/types';

export type HomepageSectionMountMode =
  | 'immediate'
  | 'after_primary_content'
  | 'when_network_available';

export const shouldPlacePerpsAboveTokens = ({
  optionalSectionsCanMount,
  isPerpsEnabled,
  perpsAboveTokensEligible,
  isActivePerpsTrader,
}: {
  optionalSectionsCanMount: boolean;
  isPerpsEnabled: boolean;
  perpsAboveTokensEligible: boolean;
  isActivePerpsTrader: boolean;
}): boolean =>
  optionalSectionsCanMount &&
  isPerpsEnabled &&
  perpsAboveTokensEligible &&
  isActivePerpsTrader;

export const shouldPlaceTopTradersAboveAllocation = ({
  optionalSectionsCanMount,
  isSocialV1PriorityEnabled,
  isSocialTopTradersEligible,
}: {
  optionalSectionsCanMount: boolean;
  isSocialV1PriorityEnabled: boolean;
  isSocialTopTradersEligible: boolean;
}): boolean =>
  optionalSectionsCanMount &&
  isSocialV1PriorityEnabled &&
  isSocialTopTradersEligible;

export const shouldShowTopTradersAboveAllocation = ({
  topTradersAboveAllocationPlacement,
  shouldMountOptionalSections,
  isTopTradersEnabled,
  isSocialV1PriorityEnabled,
}: {
  topTradersAboveAllocationPlacement: boolean;
  shouldMountOptionalSections: boolean;
  isTopTradersEnabled: boolean;
  isSocialV1PriorityEnabled: boolean;
}): boolean =>
  topTradersAboveAllocationPlacement &&
  shouldMountOptionalSections &&
  isTopTradersEnabled &&
  isSocialV1PriorityEnabled;

/**
 * Selects when non-primary Homepage sections may mount.
 *
 * The primary token surface remains mounted in every mode. An unknown network
 * uses the product-default mount mode; callers separately gate the initial
 * unresolved NetInfo state so it cannot mount optional work prematurely.
 */
export const getHomepageSectionMountMode = ({
  hardwareTier,
  networkTier,
}: {
  hardwareTier: HardwareTier | null;
  networkTier: NetworkTier | null;
}): HomepageSectionMountMode => {
  if (networkTier === 'NONE') {
    return 'when_network_available';
  }

  if (networkTier === 'SLOW_CELLULAR') {
    return 'after_primary_content';
  }

  if (
    (networkTier === 'FAST_CELLULAR' || networkTier === 'WIFI') &&
    hardwareTier === 'LOW'
  ) {
    return 'after_primary_content';
  }

  return 'immediate';
};
