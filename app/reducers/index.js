import bookmarksReducer from './bookmarks';
import engineReducer from './engine';
import privacyReducer from './privacy';
import modalsReducer from './modals';
import { combineReducers } from 'redux';

const rootReducer = combineReducers({
	engine: engineReducer,
	privacy: privacyReducer,
	bookmarks: bookmarksReducer,
	modals: modalsReducer
});

export default rootReducer;
