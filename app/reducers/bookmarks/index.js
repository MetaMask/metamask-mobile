import { REHYDRATE } from 'redux-persist';
const bookmarksReducer = (state = [], action) => {
	switch (action.type) {
		case REHYDRATE:
			return [...state, ...action.payload.bookmarks];
		case 'ADD_BOOKMARK':
			return [...state, action.bookmark];
		case 'REMOVE_BOOKMARK':
			return state.filter(item => item.url !== action.bookmark.url);
		default:
			return state;
	}
};
export default bookmarksReducer;
