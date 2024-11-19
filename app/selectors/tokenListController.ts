import { createSelector } from 'reselect';
import { TokenListState } from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import { tokenListToArray } from '../util/tokens';
import { createDeepEqualSelector } from '../selectors/util';

const selectTokenListControllerState = (state: RootState) =>
  state.engine.backgroundState.TokenListController;

/**
 * Return token list from TokenListController.
 * Can pass directly into useSelector.
 */
export const selectTokenList = createSelector(
  selectTokenListControllerState,
  (tokenListControllerState: TokenListState) =>
    tokenListControllerState?.tokenList,
);

/**
 * Return token list array from TokenListController.
 * Can pass directly into useSelector.
 */
export const selectTokenListArray = createDeepEqualSelector(
  selectTokenList,
  tokenListToArray,
);

const selectERC20TokensByChainInternal = createDeepEqualSelector(
  selectTokenListControllerState,
  (tokenListControllerState: TokenListState) => tokenListControllerState?.tokensChainsCache,
);

export const selectERC20TokensByChain = createDeepEqualSelector(
  selectERC20TokensByChainInternal,
  (tokensChainsCache: TokenListState['tokensChainsCache']) => tokensChainsCache,
);
