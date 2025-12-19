import { createSelector } from 'reselect';
import {
  RequestStatus,
  type RequestState,
  type RequestCache,
} from '@metamask/ramps-controller';
import { RootState } from '../../reducers';

/**
 * Returns the RampsController state from the engine.
 */
export const selectRampsControllerState = createSelector(
  (state: RootState) => state.engine.backgroundState.RampsController,
  (rampsControllerState) => rampsControllerState,
);

/**
 * Returns the user's geolocation from the RampsController state.
 */
export const selectGeolocation = createSelector(
  selectRampsControllerState,
  (rampsControllerState) => rampsControllerState?.geolocation ?? null,
);

/**
 * Returns the requests cache from the RampsController state.
 */
export const selectRequestsCache = createSelector(
  selectRampsControllerState,
  (rampsControllerState): RequestCache => rampsControllerState?.requests ?? {},
);

/**
 * Creates a selector that returns the state of a specific cached request.
 *
 * @param cacheKey - The cache key to look up.
 * @returns A selector that returns the request state or undefined.
 */
export const makeSelectRequestState = (cacheKey: string) =>
  createSelector(
    selectRequestsCache,
    (requests): RequestState | undefined => requests[cacheKey],
  );

/**
 * Creates a selector that returns the data from a cached request.
 *
 * @param cacheKey - The cache key to look up.
 * @returns A selector that returns the data or null.
 */
export const makeSelectRequestData = <T>(cacheKey: string) =>
  createSelector(
    makeSelectRequestState(cacheKey),
    (requestState): T | null => (requestState?.data as T) ?? null,
  );

/**
 * Creates a selector that returns whether a request is loading.
 *
 * @param cacheKey - The cache key to look up.
 * @returns A selector that returns true if the request is loading.
 */
export const makeSelectRequestIsLoading = (cacheKey: string) =>
  createSelector(
    makeSelectRequestState(cacheKey),
    (requestState): boolean => requestState?.status === RequestStatus.LOADING,
  );

/**
 * Creates a selector that returns the error from a cached request.
 *
 * @param cacheKey - The cache key to look up.
 * @returns A selector that returns the error or null.
 */
export const makeSelectRequestError = (cacheKey: string) =>
  createSelector(
    makeSelectRequestState(cacheKey),
    (requestState): string | null => requestState?.error ?? null,
  );

/**
 * Creates a selector that returns the status of a cached request.
 *
 * @param cacheKey - The cache key to look up.
 * @returns A selector that returns the status or IDLE if not cached.
 */
export const makeSelectRequestStatus = (cacheKey: string) =>
  createSelector(
    makeSelectRequestState(cacheKey),
    (requestState): RequestStatus => requestState?.status ?? RequestStatus.IDLE,
  );
