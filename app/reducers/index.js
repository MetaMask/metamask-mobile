import bookmarksReducer from './bookmarks';
import engineReducer from './engine';
import privacyReducer from './privacy';
import modalsReducer from './modals';
import settingsReducer from './settings';
import { combineReducers } from 'redux';

const rootReducer = combineReducers({
	engine: engineReducer,
	privacy: privacyReducer,
	bookmarks: bookmarksReducer,
	modals: modalsReducer,
	settings: settingsReducer
});

export default rootReducer;
