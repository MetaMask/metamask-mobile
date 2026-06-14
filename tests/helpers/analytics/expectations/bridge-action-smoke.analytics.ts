import type { AnalyticsExpectations } from '../../../framework';
import Assertions from '../../../framework/Assertions';
import { filterEvents } from '../helpers';

const BRIDGE_BUTTON_CLICKED = 'Unified SwapBridge Button Clicked';
const BRIDGE_PAGE_VIEWED = 'Unified SwapBridge Page Viewed';
const INPUT_CHANGED = 'Unified SwapBridge Input Changed';
const QUOTES_REQUESTED = 'Unified SwapBridge Quotes Requested';
const SUBMITTED = 'Unified SwapBridge Submitted';
const COMPLETED = 'Unified SwapBridge Completed';

export const bridgeActionAnalyticsExpectations: AnalyticsExpectations = {
  eventNames: [
    BRIDGE_BUTTON_CLICKED,
    BRIDGE_PAGE_VIEWED,
    INPUT_CHANGED,
    QUOTES_REQUESTED,
    SUBMITTED,
    COMPLETED,
  ],
  expectedTotalCount: 9,
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
        token_address_destination: 'eip155:8453/slip44:8453',
        token_symbol_source: 'ETH',
        token_symbol_destination: 'ETH',
      },
    },
  ],
  validate: async ({ events }) => {
    const inputChanged = filterEvents(events, INPUT_CHANGED);

    await Assertions.checkIfArrayHasLength(inputChanged, 4);

    const inputs = inputChanged.map((e) => e.properties.input);
    for (const expected of [
      'token_destination',
      'chain_source',
      'chain_destination',
      'slippage',
    ]) {
      if (!inputs.includes(expected)) {
        throw new Error(
          `Expected input=${expected} in ${INPUT_CHANGED} events. Found: ${inputs.join(', ')}`,
        );
      }
    }
  },
};
