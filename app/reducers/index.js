import bookmarksReducer from './bookmarks';
import engineReducer from './engine';
import privacyReducer from './privacy';
import modalsReducer from './modals';
import settingsReducer from './settings';
import alertReducer from './alert';
import transactionReducer from './transaction';
import userReducer from './user';
import { combineReducers } from 'redux';

const rootReducer = combineReducers({
	engine: engineReducer,
	privacy: privacyReducer,
	bookmarks: bookmarksReducer,
	modals: modalsReducer,
	settings: settingsReducer,
	alert: alertReducer,
	transaction: transactionReducer,
	user: userReducer
});

export default rootReducer;
