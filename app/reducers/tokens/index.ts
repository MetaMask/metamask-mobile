import { createSelector } from 'reselect';
import { tokenListToArray } from '../../util/tokens';

const tokenListSelector = (state: any) => state.engine.backgroundState.TokenListController.tokenList;

/**
 * Return token list from TokenListController.
 * Can pass directly into useSelector.
 */
export const getTokenList = createSelector(
	tokenListSelector,
	tokenList => tokenList
);

/**
 * Return token list array from TokenListController.
 * Can pass directly into useSelector.
 */
export const getTokenListArray = createSelector(
	tokenListSelector,
	tokenListToArray
);
