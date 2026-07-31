interface ABTestResolution {
  variantName: string;
  isActive: boolean;
}

const DEFAULT_VARIANT = 'control';

const getFlagVariantName = (flagValue: unknown): string | undefined => {
  if (typeof flagValue === 'string') {
    return flagValue;
  }

  // Legacy `{ name, value }` threshold wrapper shape (pre
  // @metamask/remote-feature-flag-controller@5). Kept as a fallback.
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
 * As of @metamask/remote-feature-flag-controller@5, threshold flags return the
 * selected value directly and the selected group name is stored separately in
 * `featureFlagThresholdGroups`. We read the variant name from there first,
 * falling back to the legacy flag-value shape for string flags.
 *
 * @param featureFlags - The resolved remote feature flags.
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
    thresholdGroups?.[flagKey] ?? getFlagVariantName(featureFlags?.[flagKey]);
  const isActive = Boolean(variantName && validVariants.includes(variantName));

  return {
    variantName: isActive ? (variantName as string) : DEFAULT_VARIANT,
    isActive,
  };
};
