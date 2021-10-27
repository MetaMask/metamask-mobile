import Analytics from '../core/Analytics';
import Logger from './Logger';
import { InteractionManager } from 'react-native';

const generateOpt = (name) => ({ category: name });

export const ANALYTICS_EVENTS_V2 = {
	// Approval
	APPROVAL_STARTED: generateOpt('Approval Started'),
	APPROVAL_COMPLETED: generateOpt('Approval Completed'),
	APPROVAL_CANCELLED: generateOpt('Approval Cancelled'),
	APPROVAL_PERMISSION_UPDATED: generateOpt('Approval Permission Updated'),
	// Fee changed
	GAS_FEE_CHANGED: generateOpt('Gas Fee Changed'),
	GAS_ADVANCED_OPTIONS_CLICKED: generateOpt('Gas Advanced Options Clicked'),
	// Dapp Transaction
	DAPP_TRANSACTION_STARTED: generateOpt('Dapp Transaction Started'),
	DAPP_TRANSACTION_COMPLETED: generateOpt('Dapp Transaction Completed'),
	DAPP_TRANSACTION_CANCELLED: generateOpt('Dapp Transaction Cancelled'),
	// Sign request
	SIGN_REQUEST_STARTED: generateOpt('Sign Request Started'),
	SIGN_REQUEST_COMPLETED: generateOpt('Sign Request Completed'),
	SIGN_REQUEST_CANCELLED: generateOpt('Sign Request Cancelled'),
	// Connect request
	CONNECT_REQUEST_STARTED: generateOpt('Connect Request Started'),
	CONNECT_REQUEST_COMPLETED: generateOpt('Connect Request Completed'),
	CONNECT_REQUEST_CANCELLED: generateOpt('Connect Request Cancelled'),
	// Wallet
	WALLET_OPENED: generateOpt('Wallet Opened'),
	TOKEN_ADDED: generateOpt('Token Added'),
	COLLECTIBLE_ADDED: generateOpt('Collectible Added'),
	// Network
	NETWORK_SWITCHED: generateOpt('Network Switched'),
	NETWORK_ADDED: generateOpt('Network Added'),
	NETWORK_REQUESTED: generateOpt('Network Requested'),
	NETWORK_REQUEST_REJECTED: generateOpt('Network Request Rejected'),
	// Send transaction
	SEND_TRANSACTION_STARTED: generateOpt('Send Transaction Started'),
	SEND_TRANSACTION_COMPLETED: generateOpt('Send Transaction Completed'),
	// On-ramp
	ONRAMP_OPENED: generateOpt('On-ramp Opened'),
	ONRAMP_CLOSED: generateOpt('On-ramp Closed'),
	ONRAMP_PURCHASE_EXITED: generateOpt('On-ramp Purchase Exited'),
	ONRAMP_PURCHASE_STARTED: generateOpt('On-ramp Purchase Started'),
	ONRAMP_PURCHASE_SUBMISSION_FAILED: generateOpt('On-ramp Submission Failed'),
	ONRAMP_PURCHASE_SUBMITTED: generateOpt('On-ramp Purchase Submitted'),
	ONRAMP_PURCHASE_FAILED: generateOpt('On-ramp Purchase Failed'),
	ONRAMP_PURCHASE_CANCELLED: generateOpt('On-ramp Purchase Cancelled'),
	ONRAMP_PURCHASE_COMPLETED: generateOpt('On-ramp Purchase Completed'),
	// Wallet Security
	WALLET_SECURITY_STARTED: generateOpt('Wallet Security Started'),
	WALLET_SECURITY_MANUAL_BACKUP_INITIATED: generateOpt('Manual Backup Initiated'),
	WALLET_SECURITY_PHRASE_REVEALED: generateOpt('Phrase Revealed'),
	WALLET_SECURITY_PHRASE_CONFIRMED: generateOpt('Phrase Confirmed'),
	WALLET_SECURITY_SKIP_INITIATED: generateOpt('Wallet Security Skip Initiated'),
	WALLET_SECURITY_SKIP_CONFIRMED: generateOpt('Wallet Security Skip Confirmed'),
	WALLET_SECURITY_RECOVERY_HINT_SAVED: generateOpt('Recovery Hint Saved'),
	WALLET_SECURITY_COMPLETED: generateOpt('Wallet Security Completed'),
	WALLET_SECURITY_PROTECT_VIEWED: generateOpt('Wallet Security Reminder Viewed'),
	WALLET_SECURITY_PROTECT_ENGAGED: generateOpt('Wallet Security Reminder Engaged'),
	WALLET_SECURITY_PROTECT_DISMISSED: generateOpt('Wallet Security Reminder Dismissed'),
	// Analytics
	ANALYTICS_PREFERENCE_SELECTED: generateOpt('Analytics Preference Selected'),
	// Onboarding
	ONBOARDING_WELCOME_MESSAGE_VIEWED: generateOpt('Welcome Message Viewed'),
	ONBOARDING_WELCOME_SCREEN_ENGAGEMENT: generateOpt('Welcome Screen Engagement'),
	ONBOARDING_STARTED: generateOpt('Onboarding Started'),
	// Wallet Setup
	WALLET_SETUP_STARTED: generateOpt('Wallet Setup Started'),
	WALLET_IMPORT_STARTED: generateOpt('Wallet Import Started'),
	WALLET_IMPORT_ATTEMPTED: generateOpt('Wallet Import Attempted'),
	WALLET_IMPORTED: generateOpt('Wallet Imported'),
	WALLET_SYNC_STARTED: generateOpt('Wallet Sync Started'),
	WALLET_SYNC_ATTEMPTED: generateOpt('Wallet Sync Attempted'),
	WALLET_SYNC_SUCCESSFUL: generateOpt('Wallet Sync Successful'),
	WALLET_CREATION_ATTEMPTED: generateOpt('Wallet Creation Attempted'),
	WALLET_CREATED: generateOpt('Wallet Created'),
	WALLET_SETUP_FAILURE: generateOpt('Wallet Setup Failure'),
	WALLET_SETUP_COMPLETED: generateOpt('Wallet Setup Completed'),
	// Onboarding Tour
	ONBOARDING_TOUR_STARTED: generateOpt('Onboarding Tour Started'),
	ONBOARDING_TOUR_SKIPPED: generateOpt('Onboarding Tour Skipped'),
	ONBOARDING_TOUR_STEP_COMPLETED: generateOpt('Onboarding Tour Step Completed'),
	ONBOARDING_TOUR_STEP_REVISITED: generateOpt('Onboarding Tour Step Completed'),
	ONBOARDING_TOUR_COMPLETED: generateOpt('Onboarding Tour Completed'),
	ONBOARDING_COMPLETED: generateOpt('Onboarding Completed'),
	// ACCOUNT
	SWITCHED_ACCOUNT: generateOpt('Switched Account'),
	// BROWSER
	BROWSER_OPENED: generateOpt('Browser Opened'),
	BROWSER_SEARCH_USED: generateOpt('Search Used'),
	BROWSER_NEW_TAB: generateOpt('New Tab Opened'),
	BROWSER_SWITCH_NETWORK: generateOpt('Switch Network'),
	BROWSER_OPEN_ACCOUNT_SWITCH: generateOpt('Opened Account Switcher'),
	BROWSER_NAVIGATION: generateOpt('Browser Menu Navigation Used'),
	BROWSER_SHARE_SITE: generateOpt('Shared A Site'),
	BROWSER_RELOAD: generateOpt('Reload Browser'),
	BROWSER_ADD_FAVORITES: generateOpt('Added Site To Favorites'),
	// SETTINGS
	SETTINGS_TOKEN_DETECTION_ON: generateOpt(`Token detection turned ON`),
	SETTINGS_TOKEN_DETECTION_OFF: generateOpt(`Token detection turned OFF`),
	// KEY MANAGMENT INVESTIGATION
	ANDROID_HARDWARE_KEYSTORE: generateOpt('Android Hardware Keystore'),
};

/**
 * This takes params with the following structure:
 * { foo : 'this is not anonymous', bar: {value: 'this is anonymous', anonymous: true} }
 * @param {Object} eventName
 * @param {Object} params
 */
export const trackEventV2 = (eventName, params) => {
	InteractionManager.runAfterInteractions(() => {
		let anonymousEvent = false;
		try {
			if (!params) {
				Analytics.trackEvent(eventName);
			}

			const userParams = {};
			const anonymousParams = {};

			for (const key in params) {
				const property = params[key];

				if (property && typeof property === 'object') {
					if (property.anonymous) {
						anonymousEvent = true;
						// Anonymous property - add only to anonymous params
						anonymousParams[key] = property.value;
					} else {
						// Non-anonymous property - add to both
						userParams[key] = property.value;
						anonymousParams[key] = property.value;
					}
				} else {
					// Non-anonymous properties - add to both
					userParams[key] = property;
					anonymousParams[key] = property;
				}
			}

			// Log all non-anonymous properties
			if (Object.keys(userParams).length) {
				Analytics.trackEventWithParameters(eventName, userParams);
			}

			// Log all anonymous properties
			if (anonymousEvent && Object.keys(anonymousParams).length) {
				Analytics.trackEventWithParameters(eventName, anonymousParams, true);
			}
		} catch (error) {
			Logger.error(error, 'Error logging analytics');
		}
	});
};

/**
 * This functions logs errors to analytics instead of sentry.
 * The objective is to log errors (that are not errors from our side) like “Invalid Password”.
 * An error like this generally means a user inserted the wrong password, so logging to sentry doesn't make sense.
 * But we still want to log this to analytics so that we are aware of a rapid increase which may mean it's an error from our side, for example, an error with the encryption library.
 * @param {String} type
 * @param {String} errorMessage
 * @param {String} otherInfo
 */
export const trackErrorAsAnalytics = (type, errorMessage, otherInfo) => {
	try {
		Analytics.trackEventWithParameters(generateOpt('Error occurred'), {
			error: true,
			type,
			errorMessage,
			otherInfo,
		});
	} catch (error) {
		Logger.error(error, 'Error logging analytics - trackErrorAsAnalytics');
	}
};

export default {
	ANALYTICS_EVENTS: ANALYTICS_EVENTS_V2,
	trackEvent: trackEventV2,
	trackErrorAsAnalytics,
};
