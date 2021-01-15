import { createSelector } from 'reselect';

// * Constants
export const SWAPS_SET_LIVENESS = 'SWAPS_SET_LIVENESS';

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

/**
 * Returns a memoized object that only has the addesses of the tokens as keys
 * and undefined as value. Useful to check if a token is supported by swaps.
 */
export const swapsTokensObjectSelector = createSelector(
	swapsTokensSelector,
	tokens => (tokens?.length > 0 ? tokens.reduce((acc, token) => ({ ...acc, [token.address]: undefined }), {}) : {})
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
