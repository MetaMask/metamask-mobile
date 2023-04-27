import { createSelector } from 'reselect';
import { tokenListToArray } from '../../util/tokens';
import { TokenListMap } from '@metamask/assets-controllers';

const tokenListSelector = (state: any) =>
  state.engine.backgroundState.TokenListController.tokenList as TokenListMap;

/**
 * Return token list from TokenListController.
 * Can pass directly into useSelector.
 */
export const getTokenList = createSelector(
  tokenListSelector,
  (tokenList: TokenListMap) => tokenList,
);

/**
 * Return token list array from TokenListController.
 * Can pass directly into useSelector.
 */
export const getTokenListArray = createSelector(
  tokenListSelector,
  tokenListToArray,
);
