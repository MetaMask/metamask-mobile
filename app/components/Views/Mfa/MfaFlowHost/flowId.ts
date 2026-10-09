import type { MfaFlow } from '../../../../util/identity/mfa/engine/types';

const flowIds = new WeakMap<MfaFlow, string>();
let lastFlowId = 0;

/**
 * A stable id per flow. The flow modal route uses it as its `getId`, so each
 * flow gets its own modal and a modal only ever shows the flow it was opened
 * for.
 *
 * @param flow - The flow.
 * @returns The flow's id.
 */
export const getMfaFlowId = (flow: MfaFlow): string => {
  let id = flowIds.get(flow);
  if (id === undefined) {
    lastFlowId += 1;
    id = String(lastFlowId);
    flowIds.set(flow, id);
  }
  return id;
};
