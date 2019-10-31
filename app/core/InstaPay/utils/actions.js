// eslint-disable-next-line import/prefer-default-export
export const setWallet = (state, action) => {
	switch (action.type) {
		case 'SET_WALLET':
			return [action.text];
		default:
			return state;
	}
};
