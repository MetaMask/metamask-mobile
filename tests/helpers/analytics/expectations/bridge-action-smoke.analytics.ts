import type { AnalyticsExpectations } from '../../../framework';
import { filterEvents } from '../helpers';

const BRIDGE_BUTTON_CLICKED = 'Unified SwapBridge Button Clicked';
const BRIDGE_PAGE_VIEWED = 'Unified SwapBridge Page Viewed';
const INPUT_CHANGED = 'Unified SwapBridge Input Changed';
const QUOTES_REQUESTED = 'Unified SwapBridge Quotes Requested';
const SUBMITTED = 'Unified SwapBridge Submitted';
const COMPLETED = 'Unified SwapBridge Completed';

/**
 * Bridge ETH→Base smoke MetaMetrics expectations.
 *
 * Do not pin `expectedTotalCount`: backend-suggested slippage hydration
 * (#33431) may emit an extra `INPUT_CHANGED` with `input=slippage` after the
 * first quote, so successful runs are often 9 filtered events rather than 8.
 * Match swap-action: assert required named events + Input Changed contents.
 */
export const bridgeActionAnalyticsExpectations: AnalyticsExpectations = {
  eventNames: [
    BRIDGE_BUTTON_CLICKED,
    BRIDGE_PAGE_VIEWED,
    INPUT_CHANGED,
    QUOTES_REQUESTED,
    SUBMITTED,
    COMPLETED,
  ],
  events: [
    {
      name: BRIDGE_BUTTON_CLICKED,
      containProperties: {
        chain_id_source: '1',
        token_address_source: '0x0000000000000000000000000000000000000000',
        token_symbol_source: 'ETH',
      },
    },
    {
      name: BRIDGE_PAGE_VIEWED,
      containProperties: {
        chain_id_source: '1',
        token_address_source: '0x0000000000000000000000000000000000000000',
        token_symbol_source: 'ETH',
      },
    },
    {
      name: QUOTES_REQUESTED,
      containProperties: {
        chain_id_source: 'eip155:1',
        chain_id_destination: 'eip155:8453',
        token_address_source: 'eip155:1/slip44:60',
        token_address_destination: 'eip155:8453/slip44:60',
        token_symbol_source: 'ETH',
        token_symbol_destination: 'ETH',
      },
    },
    {
      name: SUBMITTED,
      containProperties: {
        chain_id_source: 'eip155:1',
        chain_id_destination: 'eip155:8453',
        token_symbol_source: 'ETH',
        token_symbol_destination: 'ETH',
      },
    },
    {
      name: COMPLETED,
      containProperties: {
        chain_id_source: 'eip155:1',
        chain_id_destination: 'eip155:8453',
        token_address_source: 'eip155:1/slip44:60',
        token_address_destination: 'eip155:8453/slip44:60',
        token_symbol_source: 'ETH',
        token_symbol_destination: 'ETH',
      },
    },
  ],
  validate: async ({ events }) => {
    const inputChanged = filterEvents(events, INPUT_CHANGED);

    // Always: token_destination, chain_source, chain_destination.
    // Often +1: slippage after backend-suggested slippage hydration from quote.
    if (inputChanged.length < 3 || inputChanged.length > 4) {
      throw new Error(
        `Expected 3–4 ${INPUT_CHANGED} events (optional slippage hydration), got ${String(inputChanged.length)}`,
      );
    }

    const inputs = inputChanged.map((e) => e.properties.input);
    for (const expected of [
      'token_destination',
      'chain_source',
      'chain_destination',
    ]) {
      if (!inputs.includes(expected)) {
        throw new Error(
          `Expected input=${expected} in ${INPUT_CHANGED} events. Found: ${inputs.join(', ')}`,
        );
      }
    }

    if (inputChanged.length === 4 && !inputs.includes('slippage')) {
      throw new Error(
        `Expected input=slippage when 4 ${INPUT_CHANGED} events are present. Found: ${inputs.join(', ')}`,
      );
    }
  },
};
