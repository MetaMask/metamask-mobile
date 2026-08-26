interface ABTestResolution {
  variantName: string;
  isActive: boolean;
}

const DEFAULT_VARIANT = 'control';

const getFlagVariantName = (flagValue: unknown): string | undefined => {
  if (typeof flagValue === 'string') {
    return flagValue;
  }

  // Some flags carry the variant name in a `{ name, value }` wrapper.
  if (
    flagValue &&
    typeof flagValue === 'object' &&
    'name' in flagValue &&
    typeof flagValue.name === 'string'
  ) {
    return flagValue.name;
  }

  return undefined;
};

/**
 * Resolves the A/B test variant for a flag.
 *
 * Threshold flags expose the selected value directly, with the selected group
 * name stored separately in `featureFlagThresholdGroups`. Reads the variant name
 * from the flag value first (so a local override can force a variant), then falls
 * back to the threshold group when the flag value carries no variant name.
 *
 * @param featureFlags - The resolved remote feature flags (local overrides already applied).
 * @param flagKey - The A/B test flag key.
 * @param validVariants - The declared variant names for the test.
 * @param thresholdGroups - The `featureFlagThresholdGroups` map from controller state.
 * @returns The resolved variant name and whether the test is active.
 */
export const resolveABTestAssignment = (
  featureFlags: Record<string, unknown> | null | undefined,
  flagKey: string,
  validVariants: readonly string[],
  thresholdGroups?: Record<string, string> | null,
): ABTestResolution => {
  const variantName =
    getFlagVariantName(featureFlags?.[flagKey]) ?? thresholdGroups?.[flagKey];
  const isActive = Boolean(variantName && validVariants.includes(variantName));

  return {
    variantName: isActive ? (variantName as string) : DEFAULT_VARIANT,
    isActive,
  };
};
