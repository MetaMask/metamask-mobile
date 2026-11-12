import { MfaFlowError } from './errors';
import { createMfaFlow } from './flow';
import type { MfaFlow, MfaFlowOptions, MfaFlowResult } from './types';

let activeFlow: MfaFlow | undefined;
let activeKey: string | undefined;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

const getKey = ({ reason, request }: MfaFlowOptions) =>
  JSON.stringify([reason.operation, request]);

/**
 * Starts an MFA flow, or joins the pending one when it is the same request
 * for the same `reason.operation`. Only one flow runs at a time.
 *
 * @param options - The flow to start.
 * @returns The flow's result.
 */
export const startMfaFlow = (
  options: MfaFlowOptions,
): Promise<MfaFlowResult> => {
  if (activeFlow) {
    return activeKey === getKey(options)
      ? activeFlow.result
      : Promise.reject(new MfaFlowError('flow_in_progress'));
  }

  const flow = createMfaFlow(options);
  activeFlow = flow;
  activeKey = getKey(options);
  const clear = () => {
    if (activeFlow === flow) {
      activeFlow = undefined;
      activeKey = undefined;
      notify();
    }
  };
  flow.result.then(clear, clear);
  notify();
  // `start` never rejects: failures settle `flow.result`, returned below.
  flow.start().catch(() => undefined);
  return flow.result;
};

export const getActiveMfaFlow = (): MfaFlow | undefined => activeFlow;

export const subscribeToActiveMfaFlow = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Waits for a flow for `operation` to succeed.
 *
 * @param operation - The verification reason to wait for.
 * @returns A promise that resolves on success, and `stop` to stop waiting.
 */
export const waitForMfaFlowSuccess = (operation: string) => {
  let stop = () => undefined;
  const promise = new Promise<void>((resolve) => {
    const watched = new Set<MfaFlow>();
    const watch = () => {
      const flow = activeFlow;
      if (!flow || watched.has(flow) || flow.reason.operation !== operation) {
        return;
      }
      watched.add(flow);
      flow.result.then(
        () => resolve(),
        () => undefined,
      );
    };
    const unsubscribe = subscribeToActiveMfaFlow(watch);
    stop = () => {
      unsubscribe();
      return undefined;
    };
    watch();
  });
  return { promise, stop };
};
