const initialState = {
	bookmarks: []
};

const bookmarksReducer = (state = initialState, action) => {
	switch (action.type) {
		case 'ADD_BOOKMARK':
			return {
				...state,
				bookmarks: state.bookmarks.push(action.payload)
			};
		case 'REMOVE_BOOKMARK':
			return {
				...state,
				bookmarks: state.bookmarks.filter(item => item.url === action.payload.url)
			};
		default:
			return state;
	}
};
export default bookmarksReducer;
