import bookmarksReducer from './bookmarks';
import engineReducer from './engine';
import privacyReducer from './privacy';
import { combineReducers } from 'redux';

const rootReducer = combineReducers({
	engine: engineReducer,
	privacy: privacyReducer,
	bookmarks: bookmarksReducer
});

export default rootReducer;
