import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PERPS_CONSTANTS,
  type PerpsController,
  type PerpsPendingManualRecovery,
  type PerpsRecoveredDispatch,
} from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';

import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';
import {
  usePerpsRecoveryContext,
  type PerpsRecoveryContext,
} from './usePerpsRecoveryContext';

type RecoveryOperation = 'load' | 'status';

interface RecoveryActivity {
  readonly context?: PerpsRecoveryContext;
  readonly controller?: PerpsController;
  readonly token?: object;
  readonly dispatches: readonly PerpsRecoveredDispatch[];
  readonly protections: readonly PerpsPendingManualRecovery[];
  readonly hasLoaded: boolean;
  readonly pending?: RecoveryOperation;
  readonly error?: RecoveryOperation;
}

const EMPTY_DISPATCHES: readonly PerpsRecoveredDispatch[] = [];
const EMPTY_PROTECTIONS: readonly PerpsPendingManualRecovery[] = [];

export interface PerpsRecoveryActivitySnapshot {
  readonly context: PerpsRecoveryContext;
  readonly controller: PerpsController;
  readonly token: object;
  readonly dispatches: readonly PerpsRecoveredDispatch[];
  readonly protections: readonly PerpsPendingManualRecovery[];
}

/**
 * Loads local recovery activity for the mounted wallet/network/provider and
 * offers explicit non-financial status reconciliation. An unsuccessful refresh
 * preserves that context's last-known rows. Every result, error and completion
 * is fenced against selection changes, controller replacement and newer reads.
 *
 * @returns Scoped recovery activity and non-financial refresh operations.
 */
export function usePerpsRecovery() {
  const { context, capture, isCurrent } = usePerpsRecoveryContext();
  const controller = Engine.context.PerpsController;
  const operationRef = useRef<object | undefined>(undefined);
  const [activity, setActivity] = useState<RecoveryActivity>({
    dispatches: EMPTY_DISPATCHES,
    protections: EMPTY_PROTECTIONS,
    hasLoaded: false,
  });

  const readActivity = useCallback(
    async (operation: RecoveryOperation): Promise<boolean> => {
      const issued = capture();
      if (
        issued === undefined ||
        issued !== context ||
        !isCurrent(issued) ||
        Engine.context.PerpsController !== controller
      ) {
        return false;
      }

      const token = {};
      operationRef.current = token;
      const ownsResult = () =>
        operationRef.current === token &&
        isCurrent(issued) &&
        Engine.context.PerpsController === controller;

      setActivity((previous) => ({
        context: issued,
        controller,
        token,
        dispatches:
          previous.context === issued && previous.controller === controller
            ? previous.dispatches
            : EMPTY_DISPATCHES,
        protections:
          previous.context === issued && previous.controller === controller
            ? previous.protections
            : EMPTY_PROTECTIONS,
        hasLoaded:
          previous.context === issued &&
          previous.controller === controller &&
          previous.hasLoaded,
        pending: operation,
      }));

      try {
        if (operation === 'status') {
          await controller.reconcileRecoveredDispatches();
          if (!ownsResult()) {
            return false;
          }
        }
        const [dispatches, protections] = await Promise.all([
          controller.getRecoveredDispatches(),
          controller.getPendingManualRecoveries(),
        ]);
        if (!ownsResult()) {
          return false;
        }
        setActivity({
          context: issued,
          controller,
          token,
          dispatches,
          protections,
          hasLoaded: true,
          pending: operation,
        });
        return true;
      } catch (error) {
        if (ownsResult()) {
          Logger.error(ensureError(error, 'usePerpsRecovery.readActivity'), {
            tags: {
              feature: PERPS_CONSTANTS.FeatureName,
              component: 'usePerpsRecovery',
              action: operation,
              provider: issued.provider,
              network: issued.network,
            },
          });
          setActivity((previous) =>
            previous.token === token
              ? { ...previous, error: operation }
              : previous,
          );
        }
        return false;
      } finally {
        if (ownsResult()) {
          setActivity((previous) =>
            previous.token === token
              ? { ...previous, pending: undefined }
              : previous,
          );
        }
      }
    },
    [capture, context, controller, isCurrent],
  );

  const reload = useCallback(() => readActivity('load'), [readActivity]);
  const checkStatus = useCallback(() => readActivity('status'), [readActivity]);

  const isActivityCurrent = useCallback(
    (snapshot: PerpsRecoveryActivitySnapshot): boolean =>
      operationRef.current === snapshot.token &&
      isCurrent(snapshot.context) &&
      Engine.context.PerpsController === snapshot.controller,
    [isCurrent],
  );

  const captureActivity = useCallback(():
    | PerpsRecoveryActivitySnapshot
    | undefined => {
    const issued = capture();
    if (
      issued === undefined ||
      activity.context !== issued ||
      activity.controller !== controller ||
      activity.token === undefined ||
      !activity.hasLoaded ||
      activity.pending !== undefined ||
      activity.error !== undefined
    ) {
      return undefined;
    }
    const snapshot: PerpsRecoveryActivitySnapshot = {
      context: issued,
      controller,
      token: activity.token,
      dispatches: activity.dispatches,
      protections: activity.protections,
    };
    return isActivityCurrent(snapshot) ? snapshot : undefined;
  }, [activity, capture, controller, isActivityCurrent]);

  useEffect(() => {
    if (capture() !== context) {
      return;
    }
    reload();
    return () => {
      operationRef.current = undefined;
    };
  }, [capture, context, reload]);

  const isAvailable =
    context.address !== undefined &&
    context.network !== undefined &&
    context.provider !== undefined;
  const ownsActivity =
    activity.context === context && activity.controller === controller;

  return {
    context,
    capture,
    isCurrent,
    captureActivity,
    isActivityCurrent,
    dispatches: ownsActivity ? activity.dispatches : EMPTY_DISPATCHES,
    protections: ownsActivity ? activity.protections : EMPTY_PROTECTIONS,
    hasLoaded: ownsActivity && activity.hasLoaded,
    isAvailable,
    isLoading: isAvailable && (!ownsActivity || activity.pending !== undefined),
    error: ownsActivity ? activity.error : undefined,
    reload,
    checkStatus,
  };
}
