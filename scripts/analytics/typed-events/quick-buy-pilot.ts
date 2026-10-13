export interface EventVersionDefinition {
  readonly version: number;
  readonly properties: readonly string[];
}

export interface EventPilotDefinition {
  readonly eventName: string;
  readonly exportName: string;
  readonly versions: readonly EventVersionDefinition[];
}

/**
 * Explicit caller-owned property boundary for the first typed analytics pilot.
 *
 * The deployed Segment contract flattens event properties together with
 * automatically collected SDK and destination properties. Until the contract
 * exposes property provenance, this reviewed allowlist prevents generated
 * callers from setting those global properties.
 *
 * This is intentionally a temporary, narrow pilot configuration rather than
 * the final all-events registry. A future generic generator can derive event
 * definitions from the contract, while explicit client policy can remain
 * where caller ownership cannot be inferred safely.
 */
export const QUICK_BUY_AMOUNT_SELECTED_PILOT: EventPilotDefinition = {
  eventName: 'Quick Buy Amount Selected',
  exportName: 'QuickBuyAmountSelected',
  versions: [
    {
      version: 1,
      properties: [
        'amount_selection_method',
        'amount_usd',
        'caip19',
        'pay_with_token',
        'preset_value',
        'source',
        'trader_address',
      ],
    },
    {
      version: 2,
      properties: [
        'amount_selection_method',
        'amount_usd',
        'caip19',
        'chain_name',
        'original_entry_point',
        'pay_with_token',
        'perps_market',
        'preset_value',
        'slider_percent',
        'source',
        'trader_address',
      ],
    },
  ],
};
