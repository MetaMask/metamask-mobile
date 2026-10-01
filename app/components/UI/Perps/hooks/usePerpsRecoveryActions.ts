import { useCallback, useRef, useState } from 'react';
import {
  PERPS_CONSTANTS,
  type PerpsPendingManualRecovery,
  type PerpsProviderType,
  type PerpsRecoveredDispatch,
  type PerpsRecoveryVenueReview,
  type Position,
  type ResolveRecoveryProtectionParams,
} from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';

import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';
import type {
  PerpsRecoveryEntry,
  PerpsRecoveryPanelProps,
  PerpsRecoveryVenueSnapshot,
} from '../components/PerpsRecoveryPanel/PerpsRecoveryPanel';
import type { PerpsStackParamList } from '../types/navigation';
import type {
  usePerpsRecovery,
  PerpsRecoveryActivitySnapshot,
} from './usePerpsRecovery';

type Action = 'review' | 'acknowledge' | 'resolve';
type ActionError = PerpsRecoveryPanelProps['actionError'];

interface PendingAction {
  readonly activity: PerpsRecoveryActivitySnapshot;
  readonly kind: Action;
}

interface OwnedReview extends PerpsRecoveryVenueSnapshot {
  readonly activity: PerpsRecoveryActivitySnapshot;
  readonly venue: Extract<PerpsRecoveryVenueReview, { status: 'ready' }>;
}

interface ActionState {
  readonly activity?: PerpsRecoveryActivitySnapshot;
  readonly pending?: PendingAction;
  readonly review?: OwnedReview;
  readonly error?: ActionError;
}

const isPositivePrice = (price: string | undefined): boolean =>
  price === undefined ||
  (price.trim() !== '' && Number.isFinite(Number(price)) && Number(price) > 0);

/**
 * Owns explicit recovery review, acknowledgment and selected protection actions.
 * Authority comes from the exact completed local list and fresh owning-provider
 * venue data. Opaque identifiers are forwarded unchanged. Every async boundary
 * rejects a replaced list, account, network, controller or mounted owner.
 *
 * @param activity - The mounted owner's scoped local recovery activity.
 * @returns Fenced panel actions and typed TP/SL editor parameters.
 */
export function usePerpsRecoveryActions(
  activity: ReturnType<typeof usePerpsRecovery>,
) {
  const {
    isCurrent,
    isActivityCurrent,
    captureActivity,
    reload: reloadActivity,
    checkStatus: checkActivityStatus,
  } = activity;
  const actionRef = useRef<PendingAction | undefined>(undefined);
  const reviewRef = useRef<OwnedReview | undefined>(undefined);
  const [state, setState] = useState<ActionState>({});

  const isScopeCurrent = useCallback(
    (snapshot: PerpsRecoveryActivitySnapshot): boolean =>
      isCurrent(snapshot.context) &&
      Engine.context.PerpsController === snapshot.controller,
    [isCurrent],
  );

  const ownsAction = useCallback(
    (action: PendingAction): boolean =>
      actionRef.current === action && isActivityCurrent(action.activity),
    [isActivityCurrent],
  );

  const getEntryScope = useCallback(
    (
      entry: PerpsRecoveryEntry,
    ):
      | {
          snapshot: PerpsRecoveryActivitySnapshot;
          providerId: PerpsProviderType;
        }
      | undefined => {
      const snapshot = captureActivity();
      if (
        snapshot === undefined ||
        !('settlementKey' in entry
          ? snapshot.protections.includes(entry)
          : snapshot.dispatches.includes(entry)) ||
        entry.providerId === undefined ||
        entry.walletAddress?.toLowerCase() !==
          snapshot.context.address.toLowerCase() ||
        entry.network !== snapshot.context.network ||
        (snapshot.context.provider !== 'aggregated' &&
          entry.providerId !== snapshot.context.provider)
      ) {
        return undefined;
      }
      return { snapshot, providerId: entry.providerId };
    },
    [captureActivity],
  );

  const getReview = useCallback(
    (entry: PerpsRecoveryEntry): OwnedReview | undefined => {
      const review = reviewRef.current;
      const scope = getEntryScope(entry);
      return review !== undefined &&
        review.entry === entry &&
        scope?.snapshot.token === review.activity.token &&
        isActivityCurrent(review.activity)
        ? review
        : undefined;
    },
    [isActivityCurrent, getEntryScope],
  );

  const claim = useCallback(
    (
      snapshot: PerpsRecoveryActivitySnapshot,
      kind: Action,
    ): PendingAction | undefined => {
      if (
        !isActivityCurrent(snapshot) ||
        (actionRef.current !== undefined && ownsAction(actionRef.current))
      ) {
        return undefined;
      }
      const pending = { activity: snapshot, kind };
      actionRef.current = pending;
      setState({ activity: snapshot, pending, review: reviewRef.current });
      return pending;
    },
    [isActivityCurrent, ownsAction],
  );

  const matchesVenue = useCallback(
    (
      venue: PerpsRecoveryVenueReview,
      snapshot: PerpsRecoveryActivitySnapshot,
      providerId: PerpsProviderType,
    ): venue is Extract<PerpsRecoveryVenueReview, { status: 'ready' }> =>
      venue.status === 'ready' &&
      venue.providerId === providerId &&
      venue.walletAddress.toLowerCase() ===
        snapshot.context.address.toLowerCase() &&
      venue.network === snapshot.context.network,
    [],
  );

  const reviewEntry = useCallback(
    async (entry: PerpsRecoveryEntry): Promise<boolean> => {
      const scope = getEntryScope(entry);
      if (scope === undefined) {
        return false;
      }
      const action = claim(scope.snapshot, 'review');
      if (action === undefined) {
        return false;
      }
      reviewRef.current = undefined;
      setState({ activity: scope.snapshot, pending: action });
      let error: ActionError;
      try {
        const venue = await scope.snapshot.controller.reviewRecoveryVenue({
          providerId: scope.providerId,
        });
        if (!ownsAction(action)) {
          return false;
        }
        if (!matchesVenue(venue, scope.snapshot, scope.providerId)) {
          error = venue.status === 'unsupported' ? 'unsupported' : 'review';
          return false;
        }
        reviewRef.current = {
          activity: scope.snapshot,
          entry,
          providerId: scope.providerId,
          positions: venue.positions,
          orders: venue.orders,
          venue,
        };
        return true;
      } catch (caught) {
        if (ownsAction(action)) {
          Logger.error(ensureError(caught, 'usePerpsRecoveryActions.review'), {
            tags: {
              feature: PERPS_CONSTANTS.FeatureName,
              component: 'usePerpsRecoveryActions',
              action: 'review',
              provider: scope.providerId,
              network: scope.snapshot.context.network,
            },
          });
        }
        error = 'review';
        return false;
      } finally {
        if (ownsAction(action)) {
          actionRef.current = undefined;
          setState({
            activity: scope.snapshot,
            review: reviewRef.current,
            error,
          });
        }
      }
    },
    [claim, getEntryScope, matchesVenue, ownsAction],
  );

  const finish = useCallback(
    async (action: PendingAction, error?: ActionError): Promise<void> => {
      if (!ownsAction(action)) {
        return;
      }
      actionRef.current = undefined;
      reviewRef.current = undefined;
      setState({ activity: action.activity, error });
      await reloadActivity();
    },
    [reloadActivity, ownsAction],
  );

  const acknowledge = useCallback(
    async (entry: PerpsRecoveredDispatch): Promise<boolean> => {
      const review = getReview(entry);
      if (
        review === undefined ||
        entry.acknowledgeable === false ||
        entry.recoveryId === ''
      ) {
        return false;
      }
      const action = claim(review.activity, 'acknowledge');
      if (action === undefined) {
        return false;
      }
      let error: ActionError;
      try {
        const venue = await review.activity.controller.reviewRecoveryVenue({
          providerId: review.providerId,
        });
        if (!ownsAction(action) || getReview(entry) !== review) {
          return false;
        }
        if (!matchesVenue(venue, review.activity, review.providerId)) {
          error =
            venue.status === 'unsupported' ? 'unsupported' : 'acknowledge';
          return false;
        }
        await review.activity.controller.acknowledgeRecoveredDispatch(
          entry.recoveryId,
        );
        return ownsAction(action);
      } catch (caught) {
        if (ownsAction(action)) {
          Logger.error(
            ensureError(caught, 'usePerpsRecoveryActions.acknowledge'),
            {
              tags: {
                feature: PERPS_CONSTANTS.FeatureName,
                component: 'usePerpsRecoveryActions',
                action: 'acknowledge',
                provider: review.providerId,
                network: review.activity.context.network,
              },
            },
          );
        }
        error = 'acknowledge';
        return false;
      } finally {
        await finish(action, error);
      }
    },
    [claim, finish, getReview, matchesVenue, ownsAction],
  );

  const getPosition = useCallback(
    (entry: PerpsPendingManualRecovery): Position | undefined => {
      const review = getReview(entry);
      if (review === undefined || !entry.recoveryId) {
        return undefined;
      }
      const positions = review.positions.filter(
        (position) =>
          position.symbol === entry.symbol &&
          (position.providerId === undefined ||
            position.providerId === review.providerId),
      );
      const position = positions.length === 1 ? positions[0] : undefined;
      return position !== undefined &&
        Number.isFinite(Number(position.size)) &&
        Number(position.size) !== 0 &&
        isPositivePrice(position.entryPrice)
        ? position
        : undefined;
    },
    [getReview],
  );

  const resolve = useCallback(
    async (
      action: PendingAction,
      review: OwnedReview,
      params: ResolveRecoveryProtectionParams,
    ): Promise<{ success: boolean }> => {
      if (!ownsAction(action) || getReview(review.entry) !== review) {
        return { success: false };
      }
      let error: ActionError;
      try {
        const result =
          await review.activity.controller.resolveRecoveryProtection(params);
        if (!ownsAction(action)) {
          return { success: false };
        }
        if (
          result.providerId !== review.providerId ||
          result.status !== 'settled' ||
          !result.success
        ) {
          error =
            result.status === 'unsupported' ? 'unsupported' : 'unresolved';
          return { success: false };
        }
        return { success: true };
      } catch (caught) {
        if (ownsAction(action)) {
          Logger.error(ensureError(caught, 'usePerpsRecoveryActions.resolve'), {
            tags: {
              feature: PERPS_CONSTANTS.FeatureName,
              component: 'usePerpsRecoveryActions',
              action: 'resolve',
              provider: review.providerId,
              network: review.activity.context.network,
            },
          });
        }
        error = 'resolve';
        return { success: false };
      } finally {
        await finish(action, error);
      }
    },
    [finish, getReview, ownsAction],
  );

  const prepareProtectionEdit = useCallback(
    (
      entry: PerpsPendingManualRecovery,
    ): PerpsStackParamList['PerpsTPSL'] | undefined => {
      const review = getReview(entry);
      const position = getPosition(entry);
      if (
        review === undefined ||
        position === undefined ||
        !entry.recoveryId ||
        (actionRef.current !== undefined && ownsAction(actionRef.current))
      ) {
        return undefined;
      }
      const recoveryId = entry.recoveryId;
      let claimed: PendingAction | undefined;
      return {
        asset: entry.symbol,
        position,
        direction: Number(position.size) > 0 ? 'long' : 'short',
        leverage: position.leverage.value,
        initialTakeProfitPrice: position.takeProfitPrice,
        initialStopLossPrice: position.stopLossPrice,
        isPositionReviewCurrent: (reviewedPosition) =>
          reviewedPosition === position &&
          getReview(entry) === review &&
          getPosition(entry) === position,
        onBeforeConfirm: () => {
          if (
            claimed !== undefined ||
            getReview(entry) !== review ||
            getPosition(entry) !== position
          ) {
            return false;
          }
          claimed = claim(review.activity, 'resolve');
          return claimed !== undefined;
        },
        onConfirm: async (
          confirmedPosition,
          takeProfitPrice,
          stopLossPrice,
          trackingData,
        ) => {
          const action = claimed;
          if (action === undefined || !ownsAction(action)) {
            return { success: false };
          }
          if (
            confirmedPosition !== position ||
            (takeProfitPrice === undefined && stopLossPrice === undefined) ||
            !isPositivePrice(takeProfitPrice) ||
            !isPositivePrice(stopLossPrice)
          ) {
            await finish(action, 'resolve');
            return { success: false };
          }
          return resolve(action, review, {
            providerId: review.providerId,
            recoveryId,
            symbol: entry.symbol,
            position,
            expectedPosition: {
              size: position.size,
              entryPrice: position.entryPrice,
            },
            takeProfitPrice,
            stopLossPrice,
            trackingData,
          });
        },
      };
    },
    [claim, finish, getPosition, getReview, ownsAction, resolve],
  );

  const removeProtection = useCallback(
    async (
      entry: PerpsPendingManualRecovery,
    ): Promise<{ success: boolean }> => {
      const review = getReview(entry);
      if (review === undefined || !entry.recoveryId) {
        return { success: false };
      }
      const action = claim(review.activity, 'resolve');
      return action === undefined
        ? { success: false }
        : resolve(action, review, {
            providerId: review.providerId,
            recoveryId: entry.recoveryId,
            symbol: entry.symbol,
          });
    },
    [claim, getReview, resolve],
  );

  const refresh = useCallback(
    async (status = false): Promise<boolean> => {
      if (actionRef.current !== undefined && ownsAction(actionRef.current)) {
        return false;
      }
      reviewRef.current = undefined;
      setState({});
      return status ? checkActivityStatus() : reloadActivity();
    },
    [checkActivityStatus, reloadActivity, ownsAction],
  );

  const reload = useCallback(() => refresh(), [refresh]);
  const checkStatus = useCallback(() => refresh(true), [refresh]);

  const isActionPending =
    state.pending !== undefined && ownsAction(state.pending);
  const currentReview =
    state.review !== undefined && getReview(state.review.entry) === state.review
      ? state.review
      : undefined;

  return {
    isActionPending,
    actionError:
      state.activity !== undefined && isScopeCurrent(state.activity)
        ? state.error
        : undefined,
    review: currentReview,
    canReview: (entry: PerpsRecoveryEntry) =>
      !isActionPending && getEntryScope(entry) !== undefined,
    canEditProtection: (entry: PerpsPendingManualRecovery) =>
      !isActionPending && getPosition(entry) !== undefined,
    canRemoveProtection: (entry: PerpsPendingManualRecovery) =>
      !isActionPending && !!entry.recoveryId && getReview(entry) !== undefined,
    reviewEntry,
    acknowledge,
    prepareProtectionEdit,
    removeProtection,
    reload,
    checkStatus,
  };
}
