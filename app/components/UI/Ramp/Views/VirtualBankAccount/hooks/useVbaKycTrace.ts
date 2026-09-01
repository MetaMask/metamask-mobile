import { useEffect } from 'react';
import Engine from '../../../../../../core/Engine';
import { describeError, vbaTrace } from '../../../debug/vbaTrace';

/** Structural view of the root messenger, enough to observe KYC events. */
interface EventBus {
  subscribe: (event: string, handler: (...args: unknown[]) => void) => void;
  unsubscribe?: (event: string, handler: (...args: unknown[]) => void) => void;
}

interface KycSnapshot {
  phase?: unknown;
  statusMessage?: unknown;
  error?: unknown;
  userStatus?: unknown;
  userStatusErrorCode?: unknown;
  sumsubStatus?: unknown;
  sumsubSessionStatus?: unknown;
  activeVendor?: unknown;
  activeProduct?: unknown;
}

/**
 * Reads the fields of `KycController` state that describe where the identity
 * flow currently is. Tokens and applicant credentials are deliberately excluded.
 *
 * @returns The current snapshot, or `null` when the controller is unavailable.
 */
function readKycSnapshot(): KycSnapshot | null {
  try {
    const state = Engine.context.KycController?.state as
      | (Record<string, unknown> & {
          sumsub?: Record<string, unknown>;
        })
      | undefined;
    if (!state) {
      return null;
    }
    return {
      phase: state.phase,
      statusMessage: state.statusMessage,
      error: state.error,
      userStatus: state.userStatus,
      userStatusErrorCode: state.userStatusErrorCode,
      sumsubStatus: state.sumsub?.status,
      sumsubSessionStatus: state.sumsub?.sessionStatus,
      activeVendor: state.activeVendor,
      activeProduct: state.activeProduct,
    };
  } catch {
    return null;
  }
}

/**
 * Lists the snapshot fields that differ between two reads.
 *
 * @param previous - The previous snapshot.
 * @param next - The new snapshot.
 * @returns The names of the fields that changed.
 */
function changedKeys(
  previous: KycSnapshot | null,
  next: KycSnapshot | null,
): string[] {
  if (!previous || !next) {
    return [];
  }
  return (Object.keys(next) as (keyof KycSnapshot)[])
    .filter((key) => previous[key] !== next[key])
    .map(String);
}

/**
 * Traces the KYC listening path for a screen: subscription setup, every status
 * transition with its previous and next value, and teardown.
 *
 * Observation only. Nothing here feeds back into the flow.
 *
 * @param source - Screen name recorded on every emitted record.
 */
export function useVbaKycTrace(source: string): void {
  useEffect(() => {
    const bus = (Engine as unknown as { controllerMessenger?: EventBus })
      .controllerMessenger;

    let previous = readKycSnapshot();

    if (!bus?.subscribe) {
      vbaTrace('kyc.subscribe.unavailable', { source, snapshot: previous });
      return undefined;
    }

    const handleStatusChanged = (...args: unknown[]) => {
      vbaTrace('kyc.statusChanged', {
        source,
        origin: 'KycController:statusChanged',
        payload: args[0],
        snapshot: readKycSnapshot(),
      });
    };

    const handleStateChange = () => {
      const next = readKycSnapshot();
      const changed = changedKeys(previous, next);
      if (changed.length === 0) {
        return;
      }
      vbaTrace('kyc.transition', {
        source,
        origin: 'KycController:stateChange',
        changed,
        previous,
        next,
      });
      previous = next;
    };

    try {
      bus.subscribe('KycController:statusChanged', handleStatusChanged);
      bus.subscribe('KycController:stateChange', handleStateChange);
      vbaTrace('kyc.subscribe', {
        source,
        events: ['KycController:statusChanged', 'KycController:stateChange'],
        snapshot: previous,
      });
    } catch (error) {
      vbaTrace('kyc.subscribe.failed', { source, error: describeError(error) });
      return undefined;
    }

    return () => {
      try {
        bus.unsubscribe?.('KycController:statusChanged', handleStatusChanged);
        bus.unsubscribe?.('KycController:stateChange', handleStateChange);
      } catch (error) {
        vbaTrace('kyc.unsubscribe.failed', {
          source,
          error: describeError(error),
        });
      }
      vbaTrace('kyc.unsubscribe', { source, lastSnapshot: readKycSnapshot() });
    };
  }, [source]);
}
