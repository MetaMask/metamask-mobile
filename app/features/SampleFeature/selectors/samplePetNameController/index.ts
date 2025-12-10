import { RootState } from '../../../../reducers';
import { SamplePetnamesControllerState } from '@metamask/sample-controllers';
import { createSelector } from 'reselect';
import { Hex } from '@metamask/utils';

/**
 * Selector to get the sample petnames controller state
 *
 * @param state - The root state object
 * @returns The sample petnames controller state
 */
export const selectSamplePetnamesControllerState = (
  state: RootState,
): SamplePetnamesControllerState | undefined =>
  state.engine.backgroundState?.SamplePetnamesController;

/**
 * Selector to get all petnames by chain ID and address
 *
 * @param state - The root state object
 * @returns The petnames object organized by chain ID and address
 */
export const selectSamplePetnamesByChainIdAndAddress = createSelector(
  selectSamplePetnamesControllerState,
  (samplePetnamesControllerState: SamplePetnamesControllerState | undefined) =>
    samplePetnamesControllerState?.namesByChainIdAndAddress ?? {},
);

/**
 * Selector to get petnames for a specific chain
 *
 * @param state - The root state object
 * @param chainId - The chain ID to get petnames for
 * @returns The petnames for the given chain ID
 */
export const selectSamplePetnamesByChainId = createSelector(
  [
    selectSamplePetnamesByChainIdAndAddress,
    (_state: RootState, chainId: Hex) => chainId,
  ],
  (petnamesByChainIdAndAddress, chainId): Record<Hex, string> =>
    petnamesByChainIdAndAddress[chainId] ?? {},
);

/**
 * Selector to get a specific petname by chain ID and address
 *
 * @param state - The root state object
 * @param chainId - The chain ID
 * @param address - The address to get the petname for
 * @returns The petname for the given chain ID and address, or undefined if not found
 */
export const selectSamplePetnameByChainIdAndAddress = createSelector(
  [
    selectSamplePetnamesByChainIdAndAddress,
    (_state: RootState, chainId: Hex, _address: Hex) => chainId,
    (_state: RootState, _chainId: Hex, address: Hex) => address,
  ],
  (petnamesByChainIdAndAddress, chainId, address) =>
    petnamesByChainIdAndAddress[chainId]?.[address],
);
