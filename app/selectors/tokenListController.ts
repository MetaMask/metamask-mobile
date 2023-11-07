import { createSelector } from 'reselect';
import { TokenListState } from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import { tokenListToArray } from '../util/tokens';

const selectTokenLIstConstrollerState = (state: RootState) =>
  state.engine.backgroundState.TokenListController;

/**
 * Return token list from TokenListController.
 * Can pass directly into useSelector.
 */
export const selectTokenList = createSelector(
  selectTokenLIstConstrollerState,
  (tokenListControllerState: TokenListState) =>
    tokenListControllerState?.tokenList,
);

/**
 * Return token list array from TokenListController.
 * Can pass directly into useSelector.
 */
export const selectTokenListArray = createSelector(
  selectTokenList,
  tokenListToArray,
);
