import { REHYDRATE } from 'redux-persist';
const bookmarksReducer = (state = [], action) => {
	switch (action.type) {
		case REHYDRATE:
			if (action.payload && action.payload.bookmarks) {
				return [...state, ...action.payload.bookmarks];
			}
			return state;
		case 'ADD_BOOKMARK':
			return [...state, action.bookmark];
		case 'REMOVE_BOOKMARK':
			return state.filter((item) => item.url !== action.bookmark.url);
		default:
			return state;
	}
};
export default bookmarksReducer;
