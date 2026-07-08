/**
 * Returns whether the V2 unified ramp buy flow is enabled.
 * V2 flow uses the RampsController's selected-token mechanism and navigates
 * within the same stack; V1 used the legacy Aggregator goToBuy helper.
 * Currently always returns true — V2 is the only supported path.
 */
function useRampsUnifiedV2Enabled(): boolean {
  return true;
}

export default useRampsUnifiedV2Enabled;
