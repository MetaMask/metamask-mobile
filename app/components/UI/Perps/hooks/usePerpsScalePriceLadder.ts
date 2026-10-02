import {
  InitializationState,
  type GetScalePriceLadderParams,
  type PerpsScalePriceLadder,
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
import { newPerpsUiObservationId } from '../utils/perpsUiObservations';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { ensureError } from '../../../../util/errorUtils';
import {
  selectPerpsInitializationState,
  selectPerpsNetwork,
  selectPerpsProvider,
} from '../selectors/perpsController';

interface ScalePreviewState {
  request?: object;
  sequence?: number;
  result: PerpsScalePriceLadder | null;
  error: Error | null;
  isLoading: boolean;
}

/**
 * Load a venue-owned Scale preview for the current account and route.
 *
 * @param params - Memoized preview inputs, or undefined while inputs are incomplete.
 * @returns Current preview state and a fresh read fenced to the same form lifetime.
 */
export const usePerpsScalePriceLadder = (
  params: GetScalePriceLadderParams | undefined,
) => {
  const account = useSelector(selectSelectedInternalAccountAddress);
  const network = useSelector(selectPerpsNetwork);
  const provider = useSelector(selectPerpsProvider);
  const initialization = useSelector(selectPerpsInitializationState);
  const controller = Engine.context.PerpsController;
  const request = useMemo(
    () =>
      params && initialization === InitializationState.Initialized
        ? {
            params,
            account,
            network,
            provider,
            controller,
            sequence: 0,
            generation: newPerpsUiObservationId(),
          }
        : undefined,
    [account, initialization, network, params, provider, controller],
  );
  const requestRef = useRef(request);
  useLayoutEffect(() => {
    requestRef.current = request;
    return () => {
      requestRef.current = undefined;
    };
  }, [request]);
  const [state, setState] = useState<ScalePreviewState>({
    result: null,
    error: null,
    isLoading: false,
  });

  const refresh =
    useCallback(async (): Promise<PerpsScalePriceLadder | null> => {
      if (!request || requestRef.current !== request) return null;
      const sequence = ++request.sequence;
      setState((previous) => ({
        request,
        sequence,
        result: previous.request === request ? previous.result : null,
        error: null,
        isLoading: true,
      }));
      const isCurrent = () =>
        requestRef.current === request && request.sequence === sequence;
      try {
        const result = await request.controller.getScalePriceLadder(
          request.params,
        );
        if (!isCurrent()) return null;
        if (
          result.status === 'ready' &&
          request.params.providerId &&
          result.providerId !== request.params.providerId
        ) {
          throw new Error(
            'Scale preview provider differs from requested route',
          );
        }
        setState({ request, sequence, result, error: null, isLoading: false });
        return result;
      } catch (error) {
        if (!isCurrent()) return null;
        setState({
          request,
          sequence,
          result: null,
          error: ensureError(error, 'usePerpsScalePriceLadder'),
          isLoading: false,
        });
        return null;
      }
    }, [request]);

  useEffect(() => {
    if (request) void refresh();
  }, [refresh, request]);

  const isCurrent = request !== undefined && state.request === request;
  const isCurrentOwner = useCallback(
    () => request !== undefined && requestRef.current === request,
    [request],
  );
  return {
    observationGeneration: request?.generation ?? null,
    observationSequence: isCurrent ? (state.sequence ?? null) : null,
    result: isCurrent ? state.result : null,
    error: isCurrent ? state.error : null,
    isLoading: request !== undefined && (!isCurrent || state.isLoading),
    refresh,
    isCurrent: isCurrentOwner,
  };
};
