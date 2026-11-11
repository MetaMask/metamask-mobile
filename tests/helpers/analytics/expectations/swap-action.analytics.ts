import type { AnalyticsExpectations } from '../../../framework';
import Assertions from '../../../framework/Assertions';
import { filterEvents } from '../helpers';

const ACTION_BUTTON_CLICKED = 'Action Button Clicked';
const INPUT_CHANGED = 'Unified SwapBridge Input Changed';
const QUOTES_REQUESTED = 'Unified SwapBridge Quotes Requested';
const QUOTES_RECEIVED = 'Unified SwapBridge Quotes Received';
const SUBMITTED = 'Unified SwapBridge Submitted';
const COMPLETED = 'Unified SwapBridge Completed';

const expectedEventNames = [
  ACTION_BUTTON_CLICKED,
  INPUT_CHANGED,
  QUOTES_REQUESTED,
  QUOTES_RECEIVED,
  SUBMITTED,
  COMPLETED,
];

const quotesRequestedProperties: Record<
  string,
  string | ((value: unknown) => boolean)
> = {
  chain_id_source: 'string',
  chain_id_destination: 'string',
  token_address_source: 'string',
  token_address_destination: 'string',
  // Omitted while client slippage is Auto/unset; present after a numeric override.
  swap_type: 'string',
  custom_slippage: 'boolean',
  is_hardware_wallet: 'boolean',
  has_sufficient_funds: 'boolean',
  stx_enabled: 'boolean',
  token_symbol_source: 'string',
  token_symbol_destination: 'string',
  security_warnings: 'array',
  warnings: 'array',
  usd_amount_source: 'number',
  action_type: 'string',
};

const submittedProperties: Record<
  string,
  string | ((value: unknown) => boolean)
> = {
  action_type: 'string',
  price_impact: 'number',
  usd_quoted_gas: 'number',
  gas_included: 'boolean',
  gas_included_7702: 'boolean',
  provider: 'string',
  quoted_time_minutes: 'number',
  usd_quoted_return: 'number',
  chain_id_source: 'string',
  token_symbol_source: 'string',
  chain_id_destination: 'string',
  token_symbol_destination: 'string',
  is_hardware_wallet: 'boolean',
  swap_type: 'string',
  usd_amount_source: 'number',
  stx_enabled: 'boolean',
  custom_slippage: 'boolean',
};

const completedProperties: Record<
  string,
  string | ((value: unknown) => boolean)
> = {
  action_type: 'string',
  chain_id_source: 'string',
  token_symbol_source: 'string',
  token_address_source: 'string',
  chain_id_destination: 'string',
  token_symbol_destination: 'string',
  token_address_destination: 'string',
  slippage_limit: 'number',
  custom_slippage: 'boolean',
  usd_amount_source: 'number',
  swap_type: 'string',
  is_hardware_wallet: 'boolean',
  stx_enabled: 'boolean',
  security_warnings: 'array',
  usd_quoted_gas: 'number',
  gas_included: 'boolean',
  gas_included_7702: 'boolean',
  provider: 'string',
  quoted_time_minutes: 'number',
  usd_quoted_return: 'number',
  source_transaction: 'string',
  destination_transaction: 'string',
  actual_time_minutes: 'number',
  usd_actual_return: 'number',
  usd_actual_gas: 'string',
  quote_vs_execution_ratio: 'number',
  quoted_vs_used_gas_ratio: 'number',
  price_impact: 'number',
};

/**
 * Expected MetaMetrics payloads for the ETH->USDC swap in the swap action smoke test.
 *
 * The `validate` callback handles the Input Changed events which require advanced checks
 * (chain_source, token_destination, slippage).
 *
 * Slippage `INPUT_CHANGED` is only emitted because the test sets a numeric override;
 * there is no client-side default slippage.
 */
export const swapActionExpectations: AnalyticsExpectations = {
  eventNames: expectedEventNames,
  events: [
    { name: ACTION_BUTTON_CLICKED },
    {
      name: QUOTES_REQUESTED,
      minCount: 3,
      requiredProperties: quotesRequestedProperties,
    },
    { name: QUOTES_RECEIVED },
    {
      name: SUBMITTED,
      requiredProperties: submittedProperties,
    },
    {
      name: COMPLETED,
      requiredProperties: completedProperties,
    },
  ],
  validate: async ({ events }) => {
    const inputChanged = filterEvents(events, INPUT_CHANGED);

    // One ETH->USDC swap with a custom slippage override; there is no client
    // default slippage InputChanged.
    await Assertions.checkIfArrayHasLength(inputChanged, 5);

    for (const event of inputChanged) {
      await Assertions.checkIfValueIsDefined(event.properties.input);
      await Assertions.checkIfValueIsDefined(event.properties.input_value);
      await Assertions.checkIfValueIsDefined(event.properties.action_type);
    }

    const inputs = inputChanged.map((e) => e.properties.input);
    if (!inputs.includes('chain_source')) {
      throw new Error(
        `Expected input=chain_source in Input Changed events. Found: ${inputs.join(', ')}`,
      );
    }
    if (!inputs.includes('token_destination')) {
      throw new Error(
        `Expected input=token_destination in Input Changed events. Found: ${inputs.join(', ')}`,
      );
    }
    if (!inputs.includes('slippage')) {
      throw new Error(
        `Expected input=slippage in Input Changed events. Found: ${inputs.join(', ')}`,
      );
    }
  },
};
