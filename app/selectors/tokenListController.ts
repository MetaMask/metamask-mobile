import { createSelector } from 'reselect';
import { TokenListState } from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from '../selectors/util';
import { selectEvmChainId } from './networkController';

const selectTokenListConstrollerState = (state: RootState) =>
  state.engine.backgroundState.TokenListController;

/**
 * Return token list from TokenListController.
 * Can pass directly into useSelector.
 */
export const selectTokenList = createSelector(
  selectTokenListConstrollerState,
  selectEvmChainId,
  (tokenListControllerState: TokenListState, chainId) =>
    tokenListControllerState?.tokensChainsCache?.[chainId]?.data || [],
);

const selectERC20TokensByChainInternal = createDeepEqualSelector(
  selectTokenListConstrollerState,
  (tokenListControllerState) => tokenListControllerState?.tokensChainsCache,
);

export const selectERC20TokensByChain = createDeepEqualSelector(
  selectERC20TokensByChainInternal,
  (tokensChainsCache) => tokensChainsCache,
);
