import { REHYDRATE } from 'redux-persist';

const initialState = {
	passwordSet: false
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
		default:
			return state;
	}
};
export default userReducer;
