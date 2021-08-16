import { REHYDRATE } from 'redux-persist';
const recentsLength = 10;
const recentsReducer = (state = [], action) => {
	switch (action.type) {
		case REHYDRATE:
			if (action.payload && action.payload.recents) {
				return [...state, ...action.payload.recents];
			}
			return state;
		case 'ADD_RECENT':
			// eslint-disable-next-line no-case-declarations
			const arr = [action.recent, ...state];
			return new Array.from({ length: recentsLength }, (_, index) => arr[index]);
		default:
			return state;
	}
};
export default recentsReducer;
