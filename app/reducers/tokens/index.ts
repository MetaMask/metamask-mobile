import { createSelector } from 'reselect';

// TODO: Provide types
const tokenListSelector = (state: any) => state.engine.backgroundState.TokenListController.tokenList;

/**
 * Return token list from TokenListController.
 * Can pass directly into useSelector.
 * @param {Object} state - Redux State
 * @return {Object} - tokenList from TokenListController
 */
export const getTokenList = createSelector(
	tokenListSelector,
	tokenList => tokenList
);
