import { createSelector } from 'reselect';

// * Constants
export const SWAPS_SET_LIVENESS = 'SWAPS_SET_LIVENESS';
const MAX_TOKENS_WITH_BALANCE = 5;

// * Action Creator
export const setSwapsLiveness = live => ({ type: SWAPS_SET_LIVENESS, payload: live });

// * Selectors

/**
 * Returns the swaps liveness state
 */

export const swapsLivenessSelector = state => state.swaps.isLive;

/**
 * Returns the swaps tokens from the state
 */
export const swapsTokensSelector = state => state.engine.backgroundState.SwapsController.tokens;

const topAssets = state => state.engine.backgroundState.SwapsController.topAssets;

/**
 * Returns a memoized object that only has the addesses of the tokens as keys
 * and undefined as value. Useful to check if a token is supported by swaps.
 */
export const swapsTokensObjectSelector = createSelector(
	swapsTokensSelector,
	tokens => (tokens?.length > 0 ? tokens.reduce((acc, token) => ({ ...acc, [token.address]: undefined }), {}) : {})
);

/**
 * Balances
 */

const balances = state => state.engine.backgroundState.TokenBalancesController.contractBalances;

/**
 * Returns an array of tokens to display by default on the selector modal
 * based on the current account's balances.
 */
export const swapsTokensWithBalanceSelector = createSelector(
	swapsTokensSelector,
	balances,
	(tokens, balances) => {
		if (!tokens) {
			return [];
		}
		const baseTokens = tokens;
		const tokensAddressesWithBalance = Object.entries(balances)
			.filter(([, balance]) => !balance.isZero())
			.sort(([, balanceA], [, balanceB]) => (balanceB.lte(balanceA) ? -1 : 1))
			.map(([address]) => address.toLowerCase());
		const tokensWithBalance = [];
		const originalTokens = [];

		for (let i = 0; i < baseTokens.length; i++) {
			if (tokensAddressesWithBalance.includes(baseTokens[i].address)) {
				tokensWithBalance.push(baseTokens[i]);
			} else {
				originalTokens.push(baseTokens[i]);
			}

			if (
				tokensWithBalance.length === tokensAddressesWithBalance.length &&
				tokensWithBalance.length + originalTokens.length >= MAX_TOKENS_WITH_BALANCE
			) {
				break;
			}
		}

		const result = [...tokensWithBalance, ...originalTokens].slice(
			0,
			Math.max(tokensWithBalance.length, MAX_TOKENS_WITH_BALANCE)
		);
		return result;
	}
);

/**
 * Returns an array of tokens to display by default on the selector modal
 * based on the current account's balances.
 */
export const swapsTopAssetsSelector = createSelector(
	swapsTokensSelector,
	topAssets,
	(tokens, topAssets) => {
		if (!topAssets || !tokens) {
			return [];
		}
		return topAssets.map(({ address }) =>
			tokens?.find(token => token.address.toLowerCase() === address.toLowerCase())
		);
	}
);

// * Reducer
export const initialState = {
	isLive: true
};

function swapsReducer(state = initialState, action) {
	switch (action.type) {
		case SWAPS_SET_LIVENESS: {
			return {
				...state,
				isLive: Boolean(action.payload)
			};
		}
		default: {
			return state;
		}
	}
}

export default swapsReducer;
