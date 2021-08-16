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
			if (action?.recent && !state.includes(action.recent)) {
				console.log('add address: ', action.recent);
				const arr = [action.recent, ...state];
				return new Array.from({ length: recentsLength }, (_, index) => arr[index]);
			}
			return state;
		default:
			return state;
	}
};
export default recentsReducer;
