import { REHYDRATE } from 'redux-persist';

const initialState = {
	passwordSet: false,
	seedphraseBackedUp: false
};

const userReducer = (state = initialState, action) => {
	switch (action.type) {
		case REHYDRATE:
			if (action.payload && action.payload.user) {
				return { ...state, ...action.payload.user };
			}
			return state;
		case 'PASSWORD_SET':
			return {
				...state,
				passwordSet: true
			};
		case 'PASSWORD_UNSET':
			return {
				...state,
				passwordSet: false
			};
		case 'SEEDPHRASE_NOT_BACKED_UP':
			return {
				...state,
				seedphraseBackedUp: false
			};
		case 'SEEDPHRASE_BACKED_UP':
			return {
				...state,
				seedphraseBackedUp: true
			};
		default:
			return state;
	}
};
export default userReducer;
