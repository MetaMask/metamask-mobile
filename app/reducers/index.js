import bookmarksReducer from './bookmarks';
import browserReducer from './browser';
import engineReducer from './engine';
import privacyReducer from './privacy';
import modalsReducer from './modals';
import settingsReducer from './settings';
import alertReducer from './alert';
import transactionReducer from './transaction';
import userReducer from './user';
import wizardReducer from './wizard';
import { combineReducers } from 'redux';

const rootReducer = combineReducers({
	engine: engineReducer,
	privacy: privacyReducer,
	bookmarks: bookmarksReducer,
	browser: browserReducer,
	modals: modalsReducer,
	settings: settingsReducer,
	alert: alertReducer,
	transaction: transactionReducer,
	user: userReducer,
	wizard: wizardReducer
});

export default rootReducer;
