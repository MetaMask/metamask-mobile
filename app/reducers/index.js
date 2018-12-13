import bookmarksReducer from './bookmarks';
import engineReducer from './engine';
import { combineReducers } from 'redux';

const rootReducer = combineReducers({
	engine: engineReducer,
	bookmarks: bookmarksReducer
});

export default rootReducer;
