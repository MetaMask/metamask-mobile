// This file holds all events that the mobile app is going to
// track if the user has the MetaMetrics option ENABLED.
// In case that the MetaMetrics option is DISABLED, then none
// of these events should be tracked in any kind of service.

import { IMetaMetricsEvent } from './MetaMetrics.types';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const generateOpt = (
  category: string | CATEGORIES,
  action?: ACTIONS,
  name?: NAMES,
): IMetaMetricsEvent => {
  if (action && name) {
    return { name: category, properties: { action, name } };
  }
  return { name: category };
};

export const ONBOARDING_WIZARD_STEP_DESCRIPTION = {
  1: 'Welcome',
  2: 'Accounts',
  3: 'Account Name',
  4: 'Main Navigation',
  5: 'Browser',
  6: 'Search',
};

enum NAMES {
  //Onboarding
  ONBOARDING_METRICS_OPT_IN = 'Metrics Opt In',
  ONBOARDING_METRICS_OPT_OUT = 'Metrics Opt Out',
  ONBOARDING_SELECTED_CREATE_NEW_WALLET = 'Selected Create New Wallet',
  ONBOARDING_SELECTED_CREATE_NEW_PASSWORD = 'Selected Create New Password',
  ONBOARDING_SELECTED_IMPORT_FROM_SEED = 'Selected Import Wallet',
  ONBOARDING_SELECTED_SYNC_WITH_EXTENSION = 'Selected Sync with Extension',
  ONBOARDING_SELECTED_WITH_SEEDPHRASE = 'Selected Import with Seedphrase',
  ONBOARDING_SELECTED_TAKE_THE_TOUR = `Onboarding wizard 'Take the tour'`,
  ONBOARDING_SELECTED_NO_THANKS = `Onboarding wizard 'No thanks'`,
  ONBOARDING_SELECTED_SKIP = 'Onboarding wizard Skip',
  ONBOARDING_SELECTED_SKIP_TUTORIAL = 'Onboarding wizard Skip',
  // Navigation Drawer
  NAVIGATION_TAPS_ACCOUNT_NAME = 'Tapped Account Name / Profile',
  NAVIGATION_TAPS_SEND = "Taps on 'Send'",
  NAVIGATION_TAPS_RECEIVE = "Taps on 'Receive'",
  NAVIGATION_TAPS_BROWSER = 'Taps Browser',
  NAVIGATION_TAPS_WALLET = 'Taps Wallet',
  NAVIGATION_TAPS_TRANSACTION_HISTORY = 'Transaction History',
  NAVIGATION_TAPS_SHARE_PUBLIC_ADDRESS = 'Share my Public address',
  NAVIGATION_TAPS_VIEW_ETHERSCAN = 'View on Etherscan',
  NAVIGATION_TAPS_GET_HELP = 'Get Help',
  NAVIGATION_TAPS_SEND_FEEDBACK = 'Send Feedback',
  NAVIGATION_TAPS_SETTINGS = 'Settings',
  NAVIGATION_TAPS_LOGOUT = 'Logout',
  // Common Navigation
  COMMON_TAPS_HAMBURGER_MENU = 'Hamburger menu Tapped',
  COMMON_SWIPED_TO_OPEN_NAVIGATION = 'Swiped to open Navigation',
  COMMON_TAPS_ACCOUNT_PROFILE = 'Tapped Account Profiile',
  COMMON_SWITCHED_NETWORKS = 'Switched Networks',
  // Browser
  BROWSER_SEARCH = 'Search',
  BROWSER_FAVORITES = 'My Favorites',
  BROWSER_FEATURED_APPS = 'Featured Apps',
  BROWSER_FEATURED_APPS_OPEN = 'Featured Apps - Open App',
  // Dapp
  DAPP_BROWSER_OPTIONS = 'More Browser Options',
  DAPP_HOME = 'Home',
  DAPP_ADD_TO_FAVORITE = 'Add to Favorites',
  DAPP_OPEN_IN_BROWSER = 'Open in Browser',
  // Wallet
  WALLET_TOKENS = 'Tokens',
  WALLET_COLLECTIBLES = 'Collectibles',
  WALLET_QR_SCANNER = 'QR scanner',
  WALLET_COPIED_ADDRESS = 'Copied Address',
  WALLET_ADD_COLLECTIBLES = 'Add Collectibles',
  // Transactions
  TRANSACTIONS_CONFIRM_STARTED = 'Confirm Started',
  TRANSACTIONS_EDIT_TRANSACTION = 'Edit Transaction',
  TRANSACTIONS_EDIT_GAS = 'Edit Gas',
  TRANSACTIONS_CANCEL_TRANSACTION = 'Cancel',
  TRANSACTIONS_COMPLETED_TRANSACTION = 'Transaction Completed',
  TRANSACTIONS_CONFIRM_SIGNATURE = 'Confirm',
  TRANSACTIONS_CANCEL_SIGNATURE = 'Cancel',
  // Accounts
  ACCOUNTS_SWITCHED_ACCOUNTS = 'Switched Accounts',
  ACCOUNTS_ADDED_NEW_ACCOUNT = 'Added New Account',
  ACCOUNTS_IMPORTED_NEW_ACCOUNT = 'Imported New Account',
  // Authentication
  AUTHENTICATION_INCORRECT_PASSWORD = 'Incorrect Password',
  AUTHENTICATION_CONNECT = 'Popup Opened',
  AUTHENTICATION_CONNECT_CONFIRMED = 'Confirmed',
  AUTHENTICATION_CONNECT_CANCELED = 'Canceled',
  // Settings
  SETTINGS_GENERAL = 'General',
  SETTINGS_ADVANCED = 'Advanced',
  SETTINGS_SECURITY_AND_PRIVACY = 'Security & Privacy',
  SETTINGS_ABOUT = 'About MetaMask',
  SETTINGS_EXPERIMENTAL = 'Experimental',
  // Receive Options
  RECEIVE_OPTIONS_SHARE_ADDRESS = 'Share address',
  RECEIVE_OPTIONS_QR_CODE = 'QR Code',
  RECEIVE_OPTIONS_PAYMENT_REQUEST = 'Payment Request',
  RECEIVE_OPTIONS_BUY = 'Buy',
  // Send Flow
  SEND_FLOW_ADDS_RECIPIENT = `Adds recipient address 'Send to'`,
  SEND_FLOW_ADDS_AMOUNT = `Adds Amount`,
  SEND_FLOW_CONFIRM_SEND = `Confirm Send`,
  SEND_FLOW_ADJUSTS_TRANSACTION_FEE = `Adjusts transaction fee`,
  SEND_FLOW_CANCEL = `Cancel`,
  // Dapp Interactions
  DAPP_APPROVE_SCREEN_APPROVE = 'Approve',
  DAPP_APPROVE_SCREEN_CANCEL = 'Cancel',
  DAPP_APPROVE_SCREEN_EDIT_PERMISSION = 'Edit permission',
  DAPP_APPROVE_SCREEN_EDIT_FEE = 'Edit tx fee',
  DAPP_APPROVE_SCREEN_VIEW_DETAILS = 'View tx details',
  PAYMENTS_SELECTS_DEBIT_OR_ACH = 'Selects debit card or bank account as payment method',
  PAYMENTS_SELECTS_APPLE_PAY = 'Selects Apple Pay as payment method',
  SWAPS = 'Swaps',
}

enum ACTIONS {
  //Onboarding
  METRICS_OPTS = 'Metrics Option',
  IMPORT_OR_CREATE = 'Import or Create',
  IMPORT_OR_SYNC = 'Import or Sync',
  ONBOARDING_NEXT = 'Onboarding Next',
  ONBOARDING_SKIP = 'Onboarding Skip',
  // Navigation Drawer
  NAVIGATION_DRAWER = 'Navigation Drawer',
  // Common Navigation
  COMMON_BROWSER_DAPP_WALLET = 'Browser & Dapp & Wallet View',
  // Browser
  BROWSER_VIEW = 'Browser View',
  // Dapp
  DAPP_VIEW = 'Dapp View',
  // Wallet
  WALLET_VIEW = 'Wallet View',
  //Transactions
  CONFIRM_SCREEN = 'Confirm Screen',
  SIGN_SCREEN = 'Sign Request',
  // Accounts
  ACCOUNTS_MODAL = 'Account Modal',
  // Authentication
  UNLOCK = 'Unlock',
  CONNECT = 'Connect',
  // Settings
  SETTINGS = 'Settings',
  // Receive Options
  RECEIVE_OPTIONS = 'Receive Options',
  // Send Flow
  SEND_FLOW = 'Send Flow',
  // Dapp Interactions
  APPROVE_REQUEST = 'Approve Request',
  BUY_ETH = 'Buy ETH',
  SELECTS_DEBIT_OR_ACH = 'Selects Debit or ACH',
  SELECTS_APPLE_PAY = 'Selects Apple Pay',
  // Swaps
  QUOTE = 'Quote',
  SWAP = 'Swap',
}

enum CATEGORIES {
  ACCOUNTS = 'Accounts',
  AUTH = 'Auth',
  BROWSER_VIEW = 'Browser View',
  COMMON_NAVIGATION = 'Common Navigation',
  DAPP_VIEW = 'Dapp View',
  NAVIGATION_DRAWER = 'Navigation Drawer',
  ONBOARDING = 'Onboarding',
  SETTINGS = 'Settings',
  TRANSACTIONS = 'Transactions',
  WALLET_VIEW = 'Wallet View',
  RECEIVE_OPTIONS = 'Receive Options',
  SEND_FLOW = 'Send Flow',
  DAPP_INTERACTIONS = 'Dapp Interactions',
  WALLET = 'Wallet',
  PAYMENTS = 'Payments',
  // Swaps
  SWAPS_OPENED = 'Swaps Opened',
  SWAP_TRACKING_FAILED = 'Swap Tracking Failed',
  QUOTES_REQUESTED = 'Quotes Requested',
  QUOTES_RECEIVED = 'Quotes Received',
  QUOTES_REQUEST_CANCELLED = 'Quotes Request Cancelled',
  ALL_AVAILABLE_QUOTES_OPENED = 'All Available Quotes Opened',
  SWAP_STARTED = 'Swap Started',
  SWAP_COMPLETED = 'Swap Completed',
  SWAP_FAILED = 'Swap Failed',
  QUOTES_TIMED_OUT = 'Quotes Timed Out',
  NO_QUOTES_AVAILABLE = 'No Quotes Available',
  GAS_FEES_CHANGED = 'Gas Fees Changed',
  EDIT_SPEND_LIMIT_OPENED = 'Edit Spend Limit Opened',
  TOKEN_IMPORTED = 'Custom Token Imported',
}

const MetaMetricsEvents = {
  // V2 TRACKING EVENTS

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
  CONTRACT_ADDRESS_COPIED: generateOpt('Contract Address Copied'),
  CONTRACT_ADDRESS_NICKNAME: generateOpt('Contract Address Nickname'),
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
  // On-ramp [LEGACY]
  ONRAMP_OPENED: generateOpt('On-ramp Opened'),
  ONRAMP_CLOSED: generateOpt('On-ramp Closed'),
  ONRAMP_PURCHASE_EXITED: generateOpt('On-ramp Purchase Exited'),
  ONRAMP_PURCHASE_STARTED: generateOpt('On-ramp Purchase Started'),
  ONRAMP_PURCHASE_SUBMISSION_FAILED: generateOpt('On-ramp Submission Failed'),
  ONRAMP_PURCHASE_SUBMITTED_LEGACY: generateOpt('On-ramp Purchase Submitted'),
  ONRAMP_PURCHASE_FAILED_LEGACY: generateOpt('On-ramp Purchase Failed'),
  ONRAMP_PURCHASE_CANCELLED_LEGACY: generateOpt('On-ramp Purchase Cancelled'),
  ONRAMP_PURCHASE_COMPLETED_LEGACY: generateOpt('On-ramp Purchase Completed'),
  // Wallet Security
  WALLET_SECURITY_STARTED: generateOpt('Wallet Security Started'),
  WALLET_SECURITY_MANUAL_BACKUP_INITIATED: generateOpt(
    'Manual Backup Initiated',
  ),
  WALLET_SECURITY_PHRASE_REVEALED: generateOpt('Phrase Revealed'),
  WALLET_SECURITY_PHRASE_CONFIRMED: generateOpt('Phrase Confirmed'),
  WALLET_SECURITY_SKIP_INITIATED: generateOpt('Wallet Security Skip Initiated'),
  WALLET_SECURITY_SKIP_CONFIRMED: generateOpt('Wallet Security Skip Confirmed'),
  WALLET_SECURITY_RECOVERY_HINT_SAVED: generateOpt('Recovery Hint Saved'),
  WALLET_SECURITY_COMPLETED: generateOpt('Wallet Security Completed'),
  WALLET_SECURITY_PROTECT_VIEWED: generateOpt(
    'Wallet Security Reminder Viewed',
  ),
  WALLET_SECURITY_PROTECT_ENGAGED: generateOpt(
    'Wallet Security Reminder Engaged',
  ),
  WALLET_SECURITY_PROTECT_DISMISSED: generateOpt(
    'Wallet Security Reminder Dismissed',
  ),
  // Analytics
  ANALYTICS_PREFERENCE_SELECTED: generateOpt('Analytics Preference Selected'),
  ANALYTICS_REQUEST_DATA_DELETION: generateOpt(
    'Delete MetaMetrics Data Request Submitted',
  ),
  // Onboarding
  ONBOARDING_WELCOME_MESSAGE_VIEWED: generateOpt('Welcome Message Viewed'),
  ONBOARDING_WELCOME_SCREEN_ENGAGEMENT: generateOpt(
    'Welcome Screen Engagement',
  ),
  ONBOARDING_STARTED: generateOpt('Onboarding Started'),
  ONBOARDING_TOUR_STARTED: generateOpt('Onboarding Tour Started'),
  ONBOARDING_TOUR_SKIPPED: generateOpt('Onboarding Tour Skipped'),
  ONBOARDING_TOUR_STEP_COMPLETED: generateOpt('Onboarding Tour Step Completed'),
  ONBOARDING_TOUR_STEP_REVISITED: generateOpt('Onboarding Tour Step Completed'),
  ONBOARDING_TOUR_COMPLETED: generateOpt('Onboarding Tour Completed'),
  ONBOARDING_COMPLETED: generateOpt('Onboarding Completed'),
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
  // Account
  SWITCHED_ACCOUNT: generateOpt('Switched Account'),
  // Browser
  BROWSER_OPENED: generateOpt('Browser Opened'),
  BROWSER_SEARCH_USED: generateOpt('Search Used'),
  BROWSER_NEW_TAB: generateOpt('New Tab Opened'),
  BROWSER_SWITCH_NETWORK: generateOpt('Switch Network'),
  BROWSER_OPEN_ACCOUNT_SWITCH: generateOpt('Opened Account Switcher'),
  BROWSER_NAVIGATION: generateOpt('Browser Menu Navigation Used'),
  BROWSER_SHARE_SITE: generateOpt('Shared A Site'),
  BROWSER_RELOAD: generateOpt('Reload Browser'),
  BROWSER_ADD_FAVORITES: generateOpt('Added Site To Favorites'),
  // Security & Privacy Settings
  VIEW_SECURITY_SETTINGS: generateOpt('Views Security & Privacy'),
  // Reveal SRP
  REVEAL_SRP_CTA: generateOpt('Clicks Reveal Secret Recovery Phrase'),
  REVEAL_SRP_SCREEN: generateOpt('Views Reveal Secret Recovery Phrase'),
  GO_BACK_SRP_SCREEN: generateOpt('Clicked Back on Reveal SRP Password Page'),
  CANCEL_REVEAL_SRP_CTA: generateOpt(
    'Clicks Cancel on Reveal Secret Recovery Phrase Page',
  ),
  NEXT_REVEAL_SRP_CTA: generateOpt(
    'Clicks Next on Reveal Secret Recovery Phrase',
  ),
  VIEW_SRP: generateOpt('Views SRP'),
  SRP_DISMISS_HOLD_TO_REVEAL_DIALOG: generateOpt('Closes Hold To Reveal SRP'),
  VIEW_SRP_QR: generateOpt('Views SRP QR code'),
  COPY_SRP: generateOpt('Copies SRP to clipboard'),
  SRP_DONE_CTA: generateOpt('Clicks Done with SRP'),
  REVEAL_SRP_INITIATED: generateOpt('Reveal SRP Initiated'),
  REVEAL_SRP_CANCELLED: generateOpt('Reveal SRP Cancelled'),
  REVEAL_SRP_COMPLETED: generateOpt('Reveal SRP Completed'),
  // Reveal Private Key
  REVEAL_PRIVATE_KEY_INITIATED: generateOpt('Reveal Private Key Initiated'),
  REVEAL_PRIVATE_KEY_CANCELLED: generateOpt('Reveal Private Key Cancelled'),
  REVEAL_PRIVATE_KEY_COMPLETED: generateOpt('Reveal Private Key Completed'),
  // Key Managment
  ANDROID_HARDWARE_KEYSTORE: generateOpt('Android Hardware Keystore'),
  // QR Hardware Wallet
  CONNECT_HARDWARE_WALLET: generateOpt('Clicked Connect Hardware Wallet'),
  CONTINUE_QR_HARDWARE_WALLET: generateOpt(
    'Clicked Continue QR Hardware Wallet',
  ),
  CONNECT_HARDWARE_WALLET_SUCCESS: generateOpt(
    'Connected Account with hardware wallet',
  ),
  QR_HARDWARE_TRANSACTION_CANCELED: generateOpt(
    'User canceled QR hardware transaction',
  ),
  HARDWARE_WALLET_ERROR: generateOpt('Hardware wallet error'),

  // TOKENS
  TOKEN_DETECTED: generateOpt('Token Detected'),
  TOKEN_IMPORT_CLICKED: generateOpt('Token Import Clicked'),
  TOKEN_IMPORT_CANCELED: generateOpt('Token Import Canceled'),
  TOKENS_HIDDEN: generateOpt('Tokens Hidden'),

  // ONRAMP AGGREGATOR
  BUY_BUTTON_CLICKED: generateOpt('Buy Button Clicked'),
  ONRAMP_REGION_SELECTED: generateOpt('On-ramp Region Selected'),
  ONRAMP_PAYMENT_METHOD_SELECTED: generateOpt(
    'On-ramp Payment Method Selected',
  ),
  ONRAMP_QUOTES_REQUESTED: generateOpt('On-ramp Quotes Requested'),
  ONRAMP_CANCELED: generateOpt('On-ramp Canceled'),
  ONRAMP_QUOTES_RECEIVED: generateOpt('On-ramp Quotes Received'),
  ONRAMP_PROVIDER_SELECTED: generateOpt('On-ramp Provider Selected'),
  ONRAMP_PROVIDER_DETAILS_VIEWED: generateOpt(
    'On-ramp Provider Details Viewed',
  ),
  ONRAMP_PURCHASE_SUBMITTED: generateOpt('On-ramp Purchase Submitted'),
  ONRAMP_PURCHASE_COMPLETED: generateOpt('On-ramp Purchase Completed'),
  ONRAMP_PURCHASE_FAILED: generateOpt('On-ramp Purchase Failed'),
  ONRAMP_PURCHASE_CANCELLED: generateOpt('On-ramp Purchase Cancelled'),
  ONRAMP_PURCHASE_DETAILS_VIEWED: generateOpt(
    'On-ramp Purchase Details Viewed',
  ),
  ONRAMP_EXTERNAL_LINK_CLICKED: generateOpt('External Link Clicked'),
  ONRAMP_QUOTE_ERROR: generateOpt('On-ramp Quote Error'),
  ONRAMP_ERROR: generateOpt('On-ramp Error'),

  // --- LEGACY TRACKING EVENTS ---

  //Onboarding
  ONBOARDING_METRICS_OPT_IN: generateOpt(
    CATEGORIES.ONBOARDING,
    ACTIONS.METRICS_OPTS,
    NAMES.ONBOARDING_METRICS_OPT_IN,
  ),
  ONBOARDING_METRICS_OPT_OUT: generateOpt(
    CATEGORIES.ONBOARDING,
    ACTIONS.METRICS_OPTS,
    NAMES.ONBOARDING_METRICS_OPT_OUT,
  ),
  ONBOARDING_SELECTED_CREATE_NEW_WALLET: generateOpt(
    CATEGORIES.ONBOARDING,
    ACTIONS.IMPORT_OR_CREATE,
    NAMES.ONBOARDING_SELECTED_CREATE_NEW_WALLET,
  ),
  ONBOARDING_SELECTED_CREATE_NEW_PASSWORD: generateOpt(
    CATEGORIES.ONBOARDING,
    ACTIONS.IMPORT_OR_CREATE,
    NAMES.ONBOARDING_SELECTED_CREATE_NEW_PASSWORD,
  ),
  ONBOARDING_SELECTED_IMPORT_FROM_SEED: generateOpt(
    CATEGORIES.ONBOARDING,
    ACTIONS.IMPORT_OR_CREATE,
    NAMES.ONBOARDING_SELECTED_IMPORT_FROM_SEED,
  ),
  ONBOARDING_SELECTED_IMPORT_WITH_SEEDPHRASE: generateOpt(
    CATEGORIES.ONBOARDING,
    ACTIONS.IMPORT_OR_SYNC,
    NAMES.ONBOARDING_SELECTED_WITH_SEEDPHRASE,
  ),
  ONBOARDING_SELECTED_SYNC_WITH_EXTENSION: generateOpt(
    CATEGORIES.ONBOARDING,
    ACTIONS.IMPORT_OR_SYNC,
    NAMES.ONBOARDING_SELECTED_SYNC_WITH_EXTENSION,
  ),
  ONBOARDING_SELECTED_TAKE_THE_TOUR: generateOpt(
    CATEGORIES.ONBOARDING,
    ACTIONS.ONBOARDING_NEXT,
    NAMES.ONBOARDING_SELECTED_TAKE_THE_TOUR,
  ),
  ONBOARDING_SELECTED_NO_THANKS: generateOpt(
    CATEGORIES.ONBOARDING,
    ACTIONS.ONBOARDING_NEXT,
    NAMES.ONBOARDING_SELECTED_NO_THANKS,
  ),
  ONBOARDING_SELECTED_SKIP_TUTORIAL: generateOpt(
    CATEGORIES.ONBOARDING,
    ACTIONS.ONBOARDING_NEXT,
    NAMES.ONBOARDING_SELECTED_SKIP_TUTORIAL,
  ),
  // Navigation Drawer
  NAVIGATION_TAPS_ACCOUNT_NAME: generateOpt(
    CATEGORIES.NAVIGATION_DRAWER,
    ACTIONS.NAVIGATION_DRAWER,
    NAMES.NAVIGATION_TAPS_ACCOUNT_NAME,
  ),
  NAVIGATION_TAPS_SEND: generateOpt(
    CATEGORIES.NAVIGATION_DRAWER,
    ACTIONS.NAVIGATION_DRAWER,
    NAMES.NAVIGATION_TAPS_SEND,
  ),
  NAVIGATION_TAPS_RECEIVE: generateOpt(
    CATEGORIES.NAVIGATION_DRAWER,
    ACTIONS.NAVIGATION_DRAWER,
    NAMES.NAVIGATION_TAPS_RECEIVE,
  ),
  NAVIGATION_TAPS_BROWSER: generateOpt(
    CATEGORIES.NAVIGATION_DRAWER,
    ACTIONS.NAVIGATION_DRAWER,
    NAMES.NAVIGATION_TAPS_BROWSER,
  ),
  NAVIGATION_TAPS_WALLET: generateOpt(
    CATEGORIES.NAVIGATION_DRAWER,
    ACTIONS.NAVIGATION_DRAWER,
    NAMES.NAVIGATION_TAPS_WALLET,
  ),
  NAVIGATION_TAPS_TRANSACTION_HISTORY: generateOpt(
    CATEGORIES.NAVIGATION_DRAWER,
    ACTIONS.NAVIGATION_DRAWER,
    NAMES.NAVIGATION_TAPS_TRANSACTION_HISTORY,
  ),
  NAVIGATION_TAPS_SHARE_PUBLIC_ADDRESS: generateOpt(
    CATEGORIES.NAVIGATION_DRAWER,
    ACTIONS.NAVIGATION_DRAWER,
    NAMES.NAVIGATION_TAPS_SHARE_PUBLIC_ADDRESS,
  ),
  NAVIGATION_TAPS_VIEW_ETHERSCAN: generateOpt(
    CATEGORIES.NAVIGATION_DRAWER,
    ACTIONS.NAVIGATION_DRAWER,
    NAMES.NAVIGATION_TAPS_VIEW_ETHERSCAN,
  ),
  NAVIGATION_TAPS_GET_HELP: generateOpt(
    CATEGORIES.NAVIGATION_DRAWER,
    ACTIONS.NAVIGATION_DRAWER,
    NAMES.NAVIGATION_TAPS_GET_HELP,
  ),
  NAVIGATION_TAPS_SEND_FEEDBACK: generateOpt(
    CATEGORIES.NAVIGATION_DRAWER,
    ACTIONS.NAVIGATION_DRAWER,
    NAMES.NAVIGATION_TAPS_SEND_FEEDBACK,
  ),
  NAVIGATION_TAPS_SETTINGS: generateOpt(
    CATEGORIES.NAVIGATION_DRAWER,
    ACTIONS.NAVIGATION_DRAWER,
    NAMES.NAVIGATION_TAPS_SETTINGS,
  ),
  NAVIGATION_TAPS_LOGOUT: generateOpt(
    CATEGORIES.NAVIGATION_DRAWER,
    ACTIONS.NAVIGATION_DRAWER,
    NAMES.NAVIGATION_TAPS_LOGOUT,
  ),
  // Common Navigation
  COMMON_TAPS_HAMBURGER_MENU: generateOpt(
    CATEGORIES.COMMON_NAVIGATION,
    ACTIONS.COMMON_BROWSER_DAPP_WALLET,
    NAMES.COMMON_TAPS_HAMBURGER_MENU,
  ),
  COMMON_SWIPED_TO_OPEN_NAVIGATION: generateOpt(
    CATEGORIES.COMMON_NAVIGATION,
    ACTIONS.COMMON_BROWSER_DAPP_WALLET,
    NAMES.COMMON_SWIPED_TO_OPEN_NAVIGATION,
  ),
  COMMON_TAPS_ACCOUNT_PROFILE: generateOpt(
    CATEGORIES.COMMON_NAVIGATION,
    ACTIONS.COMMON_BROWSER_DAPP_WALLET,
    NAMES.COMMON_TAPS_ACCOUNT_PROFILE,
  ),
  COMMON_SWITCHED_NETWORKS: generateOpt(
    CATEGORIES.COMMON_NAVIGATION,
    ACTIONS.COMMON_BROWSER_DAPP_WALLET,
    NAMES.COMMON_SWITCHED_NETWORKS,
  ),
  // Browser
  BROWSER_SEARCH: generateOpt(
    CATEGORIES.BROWSER_VIEW,
    ACTIONS.BROWSER_VIEW,
    NAMES.BROWSER_SEARCH,
  ),
  BROWSER_FAVORITES: generateOpt(
    CATEGORIES.BROWSER_VIEW,
    ACTIONS.BROWSER_VIEW,
    NAMES.BROWSER_FAVORITES,
  ),
  BROWSER_FEATURED_APPS: generateOpt(
    CATEGORIES.BROWSER_VIEW,
    ACTIONS.BROWSER_VIEW,
    NAMES.BROWSER_FEATURED_APPS,
  ),
  BROWSER_FEATURED_APPS_OPEN: generateOpt(
    CATEGORIES.BROWSER_VIEW,
    ACTIONS.BROWSER_VIEW,
    NAMES.BROWSER_FEATURED_APPS_OPEN,
  ),
  // Dapp
  DAPP_BROWSER_OPTIONS: generateOpt(
    CATEGORIES.DAPP_VIEW,
    ACTIONS.DAPP_VIEW,
    NAMES.DAPP_BROWSER_OPTIONS,
  ),
  DAPP_HOME: generateOpt(
    CATEGORIES.DAPP_VIEW,
    ACTIONS.DAPP_VIEW,
    NAMES.DAPP_HOME,
  ),
  DAPP_ADD_TO_FAVORITE: generateOpt(
    CATEGORIES.DAPP_VIEW,
    ACTIONS.DAPP_VIEW,
    NAMES.DAPP_ADD_TO_FAVORITE,
  ),
  DAPP_OPEN_IN_BROWSER: generateOpt(
    CATEGORIES.DAPP_VIEW,
    ACTIONS.DAPP_VIEW,
    NAMES.DAPP_OPEN_IN_BROWSER,
  ),
  // Wallet
  WALLET_TOKENS: generateOpt(
    CATEGORIES.WALLET_VIEW,
    ACTIONS.WALLET_VIEW,
    NAMES.WALLET_TOKENS,
  ),
  WALLET_COLLECTIBLES: generateOpt(
    CATEGORIES.WALLET_VIEW,
    ACTIONS.WALLET_VIEW,
    NAMES.WALLET_COLLECTIBLES,
  ),
  WALLET_QR_SCANNER: generateOpt(
    CATEGORIES.WALLET_VIEW,
    ACTIONS.WALLET_VIEW,
    NAMES.WALLET_QR_SCANNER,
  ),
  WALLET_COPIED_ADDRESS: generateOpt(
    CATEGORIES.WALLET_VIEW,
    ACTIONS.WALLET_VIEW,
    NAMES.WALLET_COPIED_ADDRESS,
  ),
  WALLET_ADD_COLLECTIBLES: generateOpt(
    CATEGORIES.WALLET_VIEW,
    ACTIONS.WALLET_VIEW,
    NAMES.WALLET_ADD_COLLECTIBLES,
  ),
  // Transactions
  TRANSACTIONS_CONFIRM_STARTED: generateOpt(
    CATEGORIES.TRANSACTIONS,
    ACTIONS.CONFIRM_SCREEN,
    NAMES.TRANSACTIONS_CONFIRM_STARTED,
  ),
  TRANSACTIONS_EDIT_TRANSACTION: generateOpt(
    CATEGORIES.TRANSACTIONS,
    ACTIONS.CONFIRM_SCREEN,
    NAMES.TRANSACTIONS_EDIT_TRANSACTION,
  ),
  TRANSACTIONS_EDIT_GAS: generateOpt(
    CATEGORIES.TRANSACTIONS,
    ACTIONS.CONFIRM_SCREEN,
    NAMES.TRANSACTIONS_EDIT_GAS,
  ),
  TRANSACTIONS_CANCEL_TRANSACTION: generateOpt(
    CATEGORIES.TRANSACTIONS,
    ACTIONS.CONFIRM_SCREEN,
    NAMES.TRANSACTIONS_CANCEL_TRANSACTION,
  ),
  TRANSACTIONS_COMPLETED_TRANSACTION: generateOpt(
    CATEGORIES.TRANSACTIONS,
    ACTIONS.CONFIRM_SCREEN,
    NAMES.TRANSACTIONS_COMPLETED_TRANSACTION,
  ),
  TRANSACTIONS_CONFIRM_SIGNATURE: generateOpt(
    CATEGORIES.TRANSACTIONS,
    ACTIONS.SIGN_SCREEN,
    NAMES.TRANSACTIONS_CONFIRM_SIGNATURE,
  ),
  TRANSACTIONS_CANCEL_SIGNATURE: generateOpt(
    CATEGORIES.TRANSACTIONS,
    ACTIONS.SIGN_SCREEN,
    NAMES.TRANSACTIONS_CANCEL_SIGNATURE,
  ),
  // Accounts
  ACCOUNTS_SWITCHED_ACCOUNTS: generateOpt(
    CATEGORIES.ACCOUNTS,
    ACTIONS.ACCOUNTS_MODAL,
    NAMES.ACCOUNTS_SWITCHED_ACCOUNTS,
  ),
  ACCOUNTS_ADDED_NEW_ACCOUNT: generateOpt(
    CATEGORIES.ACCOUNTS,
    ACTIONS.ACCOUNTS_MODAL,
    NAMES.ACCOUNTS_ADDED_NEW_ACCOUNT,
  ),
  ACCOUNTS_IMPORTED_NEW_ACCOUNT: generateOpt(
    CATEGORIES.ACCOUNTS,
    ACTIONS.ACCOUNTS_MODAL,
    NAMES.ACCOUNTS_IMPORTED_NEW_ACCOUNT,
  ),
  // Authentication
  AUTHENTICATION_INCORRECT_PASSWORD: generateOpt(
    CATEGORIES.AUTH,
    ACTIONS.UNLOCK,
    NAMES.AUTHENTICATION_INCORRECT_PASSWORD,
  ),
  AUTHENTICATION_CONNECT: generateOpt(
    CATEGORIES.AUTH,
    ACTIONS.CONNECT,
    NAMES.AUTHENTICATION_CONNECT,
  ),
  AUTHENTICATION_CONNECT_CONFIRMED: generateOpt(
    CATEGORIES.AUTH,
    ACTIONS.CONNECT,
    NAMES.AUTHENTICATION_CONNECT_CONFIRMED,
  ),
  AUTHENTICATION_CONNECT_CANCELED: generateOpt(
    CATEGORIES.AUTH,
    ACTIONS.CONNECT,
    NAMES.AUTHENTICATION_CONNECT_CANCELED,
  ),
  // Settings
  SETTINGS_GENERAL: generateOpt(
    CATEGORIES.SETTINGS,
    ACTIONS.SETTINGS,
    NAMES.SETTINGS_GENERAL,
  ),
  SETTINGS_ADVANCED: generateOpt(
    CATEGORIES.SETTINGS,
    ACTIONS.SETTINGS,
    NAMES.SETTINGS_ADVANCED,
  ),
  SETTINGS_SECURITY_AND_PRIVACY: generateOpt(
    CATEGORIES.SETTINGS,
    ACTIONS.SETTINGS,
    NAMES.SETTINGS_SECURITY_AND_PRIVACY,
  ),
  SETTINGS_ABOUT: generateOpt(
    CATEGORIES.SETTINGS,
    ACTIONS.SETTINGS,
    NAMES.SETTINGS_ABOUT,
  ),
  SETTINGS_EXPERIMENTAL: generateOpt(
    CATEGORIES.SETTINGS,
    ACTIONS.SETTINGS,
    NAMES.SETTINGS_EXPERIMENTAL,
  ),
  // Receive Options
  RECEIVE_OPTIONS_SHARE_ADDRESS: generateOpt(
    CATEGORIES.RECEIVE_OPTIONS,
    ACTIONS.RECEIVE_OPTIONS,
    NAMES.RECEIVE_OPTIONS_SHARE_ADDRESS,
  ),
  RECEIVE_OPTIONS_QR_CODE: generateOpt(
    CATEGORIES.RECEIVE_OPTIONS,
    ACTIONS.RECEIVE_OPTIONS,
    NAMES.RECEIVE_OPTIONS_QR_CODE,
  ),
  RECEIVE_OPTIONS_PAYMENT_REQUEST: generateOpt(
    CATEGORIES.RECEIVE_OPTIONS,
    ACTIONS.RECEIVE_OPTIONS,
    NAMES.RECEIVE_OPTIONS_PAYMENT_REQUEST,
  ),
  RECEIVE_OPTIONS_BUY: generateOpt(
    CATEGORIES.RECEIVE_OPTIONS,
    ACTIONS.RECEIVE_OPTIONS,
    NAMES.RECEIVE_OPTIONS_BUY,
  ),
  // Send flow
  SEND_FLOW_ADDS_RECIPIENT: generateOpt(
    CATEGORIES.SEND_FLOW,
    ACTIONS.SEND_FLOW,
    NAMES.SEND_FLOW_ADDS_RECIPIENT,
  ),
  SEND_FLOW_ADDS_AMOUNT: generateOpt(
    CATEGORIES.SEND_FLOW,
    ACTIONS.SEND_FLOW,
    NAMES.SEND_FLOW_ADDS_AMOUNT,
  ),
  SEND_FLOW_CONFIRM_SEND: generateOpt(
    CATEGORIES.SEND_FLOW,
    ACTIONS.SEND_FLOW,
    NAMES.SEND_FLOW_CONFIRM_SEND,
  ),
  SEND_FLOW_ADJUSTS_TRANSACTION_FEE: generateOpt(
    CATEGORIES.SEND_FLOW,
    ACTIONS.SEND_FLOW,
    NAMES.SEND_FLOW_ADJUSTS_TRANSACTION_FEE,
  ),
  SEND_FLOW_CANCEL: generateOpt(
    CATEGORIES.SEND_FLOW,
    ACTIONS.SEND_FLOW,
    NAMES.SEND_FLOW_CANCEL,
  ),
  // Dapp Interactions
  DAPP_APPROVE_SCREEN_APPROVE: generateOpt(
    CATEGORIES.DAPP_INTERACTIONS,
    ACTIONS.APPROVE_REQUEST,
    NAMES.DAPP_APPROVE_SCREEN_APPROVE,
  ),
  DAPP_APPROVE_SCREEN_CANCEL: generateOpt(
    CATEGORIES.DAPP_INTERACTIONS,
    ACTIONS.APPROVE_REQUEST,
    NAMES.DAPP_APPROVE_SCREEN_CANCEL,
  ),
  DAPP_APPROVE_SCREEN_EDIT_PERMISSION: generateOpt(
    CATEGORIES.DAPP_INTERACTIONS,
    ACTIONS.APPROVE_REQUEST,
    NAMES.DAPP_APPROVE_SCREEN_EDIT_PERMISSION,
  ),
  DAPP_APPROVE_SCREEN_EDIT_FEE: generateOpt(
    CATEGORIES.DAPP_INTERACTIONS,
    ACTIONS.APPROVE_REQUEST,
    NAMES.DAPP_APPROVE_SCREEN_EDIT_FEE,
  ),
  DAPP_APPROVE_SCREEN_VIEW_DETAILS: generateOpt(
    CATEGORIES.DAPP_INTERACTIONS,
    ACTIONS.APPROVE_REQUEST,
    NAMES.DAPP_APPROVE_SCREEN_VIEW_DETAILS,
  ),
  PAYMENTS_SELECTS_DEBIT_OR_ACH: generateOpt(
    CATEGORIES.PAYMENTS,
    ACTIONS.SELECTS_DEBIT_OR_ACH,
    NAMES.PAYMENTS_SELECTS_DEBIT_OR_ACH,
  ),
  PAYMENTS_SELECTS_APPLE_PAY: generateOpt(
    CATEGORIES.PAYMENTS,
    ACTIONS.SELECTS_APPLE_PAY,
    NAMES.PAYMENTS_SELECTS_APPLE_PAY,
  ),
  // Swaps
  SWAPS_OPENED: generateOpt(CATEGORIES.SWAPS_OPENED, ACTIONS.SWAP, NAMES.SWAPS),
  QUOTES_REQUESTED: generateOpt(
    CATEGORIES.QUOTES_REQUESTED,
    ACTIONS.QUOTE,
    NAMES.SWAPS,
  ),
  QUOTES_RECEIVED: generateOpt(
    CATEGORIES.QUOTES_RECEIVED,
    ACTIONS.QUOTE,
    NAMES.SWAPS,
  ),
  QUOTES_REQUEST_CANCELLED: generateOpt(
    CATEGORIES.QUOTES_REQUEST_CANCELLED,
    ACTIONS.QUOTE,
    NAMES.SWAPS,
  ),
  ALL_AVAILABLE_QUOTES_OPENED: generateOpt(
    CATEGORIES.ALL_AVAILABLE_QUOTES_OPENED,
    ACTIONS.QUOTE,
    NAMES.SWAPS,
  ),
  SWAP_STARTED: generateOpt(CATEGORIES.SWAP_STARTED, ACTIONS.SWAP, NAMES.SWAPS),
  SWAP_COMPLETED: generateOpt(
    CATEGORIES.SWAP_COMPLETED,
    ACTIONS.SWAP,
    NAMES.SWAPS,
  ),
  SWAP_FAILED: generateOpt(CATEGORIES.SWAP_FAILED, ACTIONS.SWAP, NAMES.SWAPS),
  SWAP_TRACKING_FAILED: generateOpt(
    CATEGORIES.SWAP_TRACKING_FAILED,
    ACTIONS.SWAP,
    NAMES.SWAPS,
  ),
  QUOTES_TIMED_OUT: generateOpt(
    CATEGORIES.QUOTES_TIMED_OUT,
    ACTIONS.QUOTE,
    NAMES.SWAPS,
  ),
  NO_QUOTES_AVAILABLE: generateOpt(
    CATEGORIES.NO_QUOTES_AVAILABLE,
    ACTIONS.QUOTE,
    NAMES.SWAPS,
  ),
  GAS_FEES_CHANGED: generateOpt(
    CATEGORIES.GAS_FEES_CHANGED,
    ACTIONS.QUOTE,
    NAMES.SWAPS,
  ),
  EDIT_SPEND_LIMIT_OPENED: generateOpt(
    CATEGORIES.EDIT_SPEND_LIMIT_OPENED,
    ACTIONS.QUOTE,
    NAMES.SWAPS,
  ),
  CUSTOM_TOKEN_IMPORTED: generateOpt(
    CATEGORIES.TOKEN_IMPORTED,
    ACTIONS.SWAP,
    NAMES.SWAPS,
  ),
};

export { MetaMetricsEvents };
