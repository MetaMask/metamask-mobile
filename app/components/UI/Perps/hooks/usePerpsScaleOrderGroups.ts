import {
  InitializationState,
  type ScaleOrderGroup,
} from '@metamask/perps-controller';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { ensureError } from '../../../../util/errorUtils';
import { PerpsCacheInvalidator } from '../services/PerpsCacheInvalidator';
import {
  selectPerpsInitializationState,
  selectPerpsNetwork,
  selectPerpsProvider,
} from '../selectors/perpsController';

interface ScaleGroupState {
  context?: object;
  groups: ScaleOrderGroup[];
  error: Error | null;
  isPending: boolean;
}

/**
 * Read and manage durable Scale ownership in one mounted account context.
 *
 * @param options - Refresh the owning stream after a current action settles.
 * @returns Owned groups and explicit review/cancel actions; stale actions cannot update this owner.
 */
export const usePerpsScaleOrderGroups = (options?: {
  onOrdersChanged?: () => void;
}) => {
  const onOrdersChanged = options?.onOrdersChanged;
  const address = useSelector(selectSelectedInternalAccountAddress);
  const network = useSelector(selectPerpsNetwork);
  const provider = useSelector(selectPerpsProvider);
  const initialization = useSelector(selectPerpsInitializationState);
  const controller = Engine.context.PerpsController;
  const context = useMemo(
    () =>
      initialization === InitializationState.Initialized && address
        ? {
            address: address.toLowerCase(),
            network,
            provider,
            controller,
            sequence: 0,
            locked: false,
          }
        : undefined,
    [address, network, provider, controller, initialization],
  );
  const contextRef = useRef(context);
  const [state, setState] = useState<ScaleGroupState>({
    groups: [],
    error: null,
    isPending: false,
  });
  useLayoutEffect(() => {
    contextRef.current = context;
    return () => {
      contextRef.current = undefined;
    };
  }, [context]);

  const read = useCallback(async () => {
    if (!context || contextRef.current !== context || context.locked) return;
    const sequence = ++context.sequence;
    const isCurrent = () =>
      contextRef.current === context && sequence === context.sequence;
    try {
      const groups = await context.controller.getScaleOrderGroups();
      if (!isCurrent()) return;
      setState({ context, groups, error: null, isPending: false });
    } catch (error) {
      if (!isCurrent()) return;
      setState((previous) => ({
        ...previous,
        context,
        groups: previous.context === context ? previous.groups : [],
        error: ensureError(error, 'usePerpsScaleOrderGroups.read'),
        isPending: false,
      }));
    }
  }, [context]);
  useEffect(() => {
    void read();
    return PerpsCacheInvalidator.subscribe('accountState', () => {
      void read();
    });
  }, [read]);

  const currentState = state.context === context ? state : undefined;
  const groups = useMemo(
    () =>
      currentState?.groups.filter(
        (group) =>
          group.walletAddress.toLowerCase() === context?.address &&
          group.network === context.network &&
          (context.provider === 'aggregated' ||
            group.providerId === context.provider),
      ) ?? [],
    [currentState, context],
  );
  const groupsRef = useRef(groups);
  useLayoutEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  const actOnGroup = useCallback(
    async (group: ScaleOrderGroup, cancel: boolean) => {
      if (
        !context ||
        contextRef.current !== context ||
        context.locked ||
        !groupsRef.current.includes(group) ||
        group.orderId !== group.groupId
      )
        return;
      context.locked = true;
      ++context.sequence;
      const isCurrent = () => contextRef.current === context;
      setState((previous) => ({
        ...previous,
        context,
        error: null,
        isPending: true,
      }));
      try {
        if (cancel) {
          const result = await context.controller.cancelOrder({
            orderId: group.groupId,
            symbol: group.symbol,
            providerId: group.providerId,
            orderType: 'scale',
          });
          if (!isCurrent()) return;
          if (!result.success)
            throw new Error(result.error ?? 'Scale cancellation is unresolved');
        } else {
          await context.controller.reviewScaleOrderGroups({
            providerId: group.providerId,
          });
          if (!isCurrent()) return;
        }
        const refreshed = await context.controller.getScaleOrderGroups();
        if (!isCurrent()) return;
        setState({ context, groups: refreshed, error: null, isPending: false });
        PerpsCacheInvalidator.invalidate('positions');
        PerpsCacheInvalidator.invalidate('accountState');
        onOrdersChanged?.();
      } catch (error) {
        if (!isCurrent()) return;
        setState((previous) => ({
          ...previous,
          context,
          error: ensureError(error, 'usePerpsScaleOrderGroups.action'),
          isPending: false,
        }));
      } finally {
        context.locked = false;
      }
    },
    [context, onOrdersChanged],
  );

  return {
    groups,
    error: currentState?.error ?? null,
    isPending: currentState?.isPending ?? false,
    reload: read,
    review: (group: ScaleOrderGroup) => actOnGroup(group, false),
    cancel: (group: ScaleOrderGroup) => actOnGroup(group, true),
  };
};
