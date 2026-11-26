import type { NetworkConditions } from '../../util/deviceCapability/conditions';
import { LATENCY_THRESHOLDS } from '../../util/deviceCapability/thresholds';

const DEFAULT_TIMEOUT = 15000;

/** Returns the request time budget for this hardware tier. */
export function resolveTimeout(
  conditions: NetworkConditions,
  enabled: boolean,
): number {
  return enabled && conditions.hardware
    ? LATENCY_THRESHOLDS[conditions.hardware].hungMs
    : DEFAULT_TIMEOUT;
}
