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
import onboardingReducer from './onboarding';
import fiatOrders from './fiatOrders';
import swapsReducer from './swaps';
import notificationReducer from './notification';
import infuraAvailabilityReducer from './infuraAvailability';
import collectiblesReducer from './collectibles';
import recentsReducer from './recents';
import { combineReducers } from 'redux';

const rootReducer = combineReducers({
	collectibles: collectiblesReducer,
	engine: engineReducer,
	privacy: privacyReducer,
	bookmarks: bookmarksReducer,
	recents: recentsReducer,
	browser: browserReducer,
	modals: modalsReducer,
	settings: settingsReducer,
	alert: alertReducer,
	transaction: transactionReducer,
	user: userReducer,
	wizard: wizardReducer,
	onboarding: onboardingReducer,
	notification: notificationReducer,
	swaps: swapsReducer,
	fiatOrders,
	infuraAvailability: infuraAvailabilityReducer,
});

export default rootReducer;
