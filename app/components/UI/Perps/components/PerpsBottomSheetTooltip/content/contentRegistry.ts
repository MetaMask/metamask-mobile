import FeesTooltipContent from './FeesTooltipContent';
import WithdrawalFeesTooltipContent from './WithdrawalFeesTooltipContent';
import { ContentRegistry } from './types';

/**
 * Registry of custom content renderers for specific tooltip content keys.
 *
 * - If a contentKey has a renderer defined here, it will use the custom component
 * - If a contentKey is not in this registry, it will fall back to the default string-based content
 *
 * To add a new custom tooltip:
 * 1. Create a new component in this directory (e.g., MyCustomTooltipContent.tsx)
 * 2. Add it to this registry: myContentKey: MyCustomTooltipContent
 */
export const tooltipContentRegistry: ContentRegistry = {
  fees: FeesTooltipContent, // Now works for both order and close position views
  closing_fees: FeesTooltipContent, // Use the same component, it handles both cases
  withdrawal_fees: WithdrawalFeesTooltipContent,
  receive: undefined,
  leverage: undefined,
  liquidation_price: undefined,
  margin: undefined,
  open_interest: undefined,
  funding_rate: undefined,
  geo_block: undefined,
  estimated_pnl: undefined, // Uses default string content
  limit_price: undefined, // Uses default string content
  tp_sl: undefined,
};
