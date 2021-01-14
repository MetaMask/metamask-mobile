import { createSelector } from 'reselect';

// * Constants

// * Selectors

/**
 * Returns the swaps tokens from the state
 */
export const swapsTokensSelector = state => state.engine.backgroundState.SwapsController.tokens;

/**
 * Returns a memoized object that only has the addesses of the tokens as keys
 * and undefined as value. Useful to check if a token is supported by swaps.
 */
export const swapsTokensObjectSelector = createSelector(
	swapsTokensSelector,
	tokens => tokens.reduce((acc, token) => ({ ...acc, [token.address]: undefined }), {})
);

// * Reducer
export const initialState = {};

function swapsReducer(state = initialState, action) {
	switch (action.type) {
		default: {
			return state;
		}
	}
}

export default swapsReducer;
