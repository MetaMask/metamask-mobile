import bookmarksReducer from './bookmarks';
import browserReducer from './browser';
import engineReducer from './engine';
import privacyReducer from './privacy';
import modalsReducer from './modals';
import settingsReducer from './settings';
import alertReducer from './alert';
import transactionReducer from './transaction';
import newTransactionReducer from './newTransaction';
import userReducer from './user';
import wizardReducer from './wizard';
import analyticsReducer from './analytics';
import onboardingReducer from './onboarding';
import { combineReducers } from 'redux';

const rootReducer = combineReducers({
	analytics: analyticsReducer,
	engine: engineReducer,
	privacy: privacyReducer,
	bookmarks: bookmarksReducer,
	browser: browserReducer,
	modals: modalsReducer,
	settings: settingsReducer,
	alert: alertReducer,
	transaction: transactionReducer,
	newTransaction: newTransactionReducer,
	user: userReducer,
	wizard: wizardReducer,
	onboarding: onboardingReducer
});

export default rootReducer;
