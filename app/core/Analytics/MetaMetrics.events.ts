// This file holds all events that the mobile app is going to
// track if the user has the MetaMetrics option ENABLED.
// In case that the MetaMetrics option is DISABLED, then none
// of these events should be tracked in any kind of service.

import { IMetaMetricsEvent } from './MetaMetrics.types';

export const generateOpt = (
  name: EVENT_NAME,
  action?: ACTIONS,
  description?: DESCRIPTION,
): IMetaMetricsEvent => {
  if (action || description) {
    return {
      category: name,
      properties: {
        ...(action && { action }),
        ...(description && { name: description }),
      },
    };
  }
  return { category: name };
};

/**
 * Analytics Tracking Events
 */
enum EVENT_NAME {
  // App
  APP_OPENED = 'App Opened',

  // Error
  ERROR = 'Error occurred',
  ERROR_SCREEN_VIEWED = 'Error Screen Viewed',

  ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
  // Sample feature
  SETTINGS_SAMPLE_FEATURE = 'Settings Sample Feature',
  ///: END:ONLY_INCLUDE_IF

  // Approval
  APPROVAL_STARTED = 'Approval Started',
  APPROVAL_COMPLETED = 'Approval Completed',
  APPROVAL_CANCELLED = 'Approval Cancelled',
  APPROVAL_PERMISSION_UPDATED = 'Approval Permission Updated',

  // Fee changed
  GAS_ADVANCED_OPTIONS_CLICKED = 'Gas Advanced Options Clicked',

  // Dapp Transaction
  DAPP_TRANSACTION_STARTED = 'Dapp Transaction Started',
  DAPP_TRANSACTION_COMPLETED = 'Dapp Transaction Completed',
  DAPP_TRANSACTION_CANCELLED = 'Dapp Transaction Cancelled',
  CONTRACT_ADDRESS_COPIED = 'Contract Address Copied',
  CONTRACT_ADDRESS_NICKNAME = 'Contract Address Nickname',

  // Sign request
  SIGNATURE_REQUESTED = 'Signature Requested',
  SIGNATURE_APPROVED = 'Signature Approved',
  SIGNATURE_REJECTED = 'Signature Rejected',

  // Connect request
  CONNECT_REQUEST_STARTED = 'Connect Request Started',
  CONNECT_REQUEST_COMPLETED = 'Connect Request Completed',
  CONNECT_REQUEST_OTPFAILURE = 'Connect Request OTP Failure',
  CONNECT_REQUEST_CANCELLED = 'Connect Request Cancelled',

  // Phishing
  PHISHING_PAGE_DISPLAYED = 'Phishing Page Displayed',
  PROCEED_ANYWAY_CLICKED = 'Proceed Anyway Clicked',

  // Wallet
  WALLET_OPENED = 'Wallet Opened',
  TOKEN_ADDED = 'Token Added',
  COLLECTIBLE_ADDED = 'Collectible Added',
  NFT_DETAILS_OPENED = 'NFT Details Opened',
  TOKEN_LIST_ITEM_CLICKED = 'Token List Item Clicked',
  DEFI_TAB_SELECTED = 'DeFi Tab Selected',
  DEFI_PROTOCOL_DETAILS_OPENED = 'DeFi Protocol Details Opened',
  VIEW_ALL_ASSETS_CLICKED = 'View All Assets Clicked',

  // Network
  NETWORK_SWITCHED = 'Network Switched',
  NETWORK_ADDED = 'Network Added',
  NETWORK_REQUESTED = 'Network Requested',
  NETWORK_REQUEST_REJECTED = 'Network Request Rejected',
  NETWORK_SELECTOR = 'Network Menu Opened',

  // Asset Filter
  ASSET_FILTER_SELECTED = 'Default Asset Filter Selected',
  ASSET_FILTER_CUSTOM_SELECTED = 'Custom Asset Filter Selected',

  // Send transaction
  SEND_TRANSACTION_STARTED = 'Send Transaction Started',
  SEND_TRANSACTION_COMPLETED = 'Send Transaction Completed',

  // Portfolio
  PORTFOLIO_LINK_CLICKED = 'Portfolio Link Clicked',

  // Link redirects
  LINK_CLICKED = 'Link Clicked',

  // Wallet Security
  WALLET_SECURITY_STARTED = 'SRP Backup Selected',
  WALLET_SECURITY_MANUAL_BACKUP_INITIATED = 'Manual Backup Initiated',
  WALLET_SECURITY_PHRASE_REVEALED = 'Phrase Revealed',
  WALLET_SECURITY_PHRASE_CONFIRMED = 'Phrase Confirmed',
  WALLET_SECURITY_SKIP_INITIATED = 'SRP Skip Backup Selected',
  WALLET_SECURITY_SKIP_CONFIRMED = 'SRP Backup Skipped',
  WALLET_SECURITY_SKIP_CANCELED = 'SRP Skip Backup Canceled',
  WALLET_SECURITY_RECOVERY_HINT_SAVED = 'Recovery Hint Saved',
  WALLET_SECURITY_COMPLETED = 'SRP Backup Confirmed',
  WALLET_SECURITY_PROTECT_VIEWED = 'Wallet Security Reminder Viewed',
  WALLET_SECURITY_PROTECT_ENGAGED = 'Wallet Security Reminder Engaged',
  WALLET_SECURITY_PROTECT_DISMISSED = 'Wallet Security Reminder Dismissed',
  SRP_DEFINITION_CLICKED = 'SRP Definition Clicked',

  // Analytics
  ANALYTICS_PREFERENCE_SELECTED = 'Analytics Preference Selected',
  ANALYTICS_REQUEST_DATA_DELETION = 'Delete MetaMetrics Data Request Submitted',

  // Onboarding
  ONBOARDING_WELCOME_MESSAGE_VIEWED = 'Welcome Message Viewed',
  ONBOARDING_WELCOME_SCREEN_ENGAGEMENT = 'Welcome Screen Engagement',
  ONBOARDING_STARTED = 'Onboarding Started',
  ONBOARDING_TOUR_STARTED = 'Onboarding Tour Started',
  ONBOARDING_TOUR_SKIPPED = 'Onboarding Tour Skipped',
  ONBOARDING_TOUR_STEP_COMPLETED = 'Onboarding Tour Step Completed',
  ONBOARDING_TOUR_STEP_REVISITED = 'Onboarding Tour Step Completed',
  ONBOARDING_TOUR_COMPLETED = 'Onboarding Tour Completed',

  // Wallet Setup
  WALLET_SETUP_STARTED = 'Wallet Setup Started',
  WALLET_IMPORT_STARTED = 'Wallet Import Started',
  WALLET_IMPORT_ATTEMPTED = 'Wallet Import Attempted',
  WALLET_IMPORTED = 'Wallet Imported',
  WALLET_CREATION_ATTEMPTED = 'Wallet Creation Attempted',
  WALLET_CREATED = 'Wallet Created',
  WALLET_SETUP_FAILURE = 'Wallet Setup Failure',
  WALLET_SETUP_COMPLETED = 'Wallet Setup Completed',
  SOCIAL_LOGIN_COMPLETED = 'Social Login Completed',
  SOCIAL_LOGIN_FAILED = 'Social Login Failed',
  ACCOUNT_ALREADY_EXISTS_PAGE_VIEWED = 'Account Already Exists Page Viewed',
  ACCOUNT_NOT_FOUND_PAGE_VIEWED = 'Account Not Found Page Viewed',
  REHYDRATION_PASSWORD_ATTEMPTED = 'Rehydration Password Attempted',
  REHYDRATION_COMPLETED = 'Rehydration Completed',
  REHYDRATION_PASSWORD_FAILED = 'Rehydration Password Failed',
  PASSWORD_CHANGED = 'Password Changed',
  FORGOT_PASSWORD_CLICKED = 'Forgot Password Clicked',
  USE_DIFFERENT_LOGIN_METHOD_CLICKED = 'Use Different Login Method Clicked',
  RESET_WALLET = 'Reset Wallet',

  // Account
  SWITCHED_ACCOUNT = 'Switched Account',

  // Browser
  BROWSER_OPENED = 'Browser Opened',
  BROWSER_SEARCH_USED = 'Search Used',
  BROWSER_NEW_TAB = 'New Tab Opened',
  BROWSER_OPEN_ACCOUNT_SWITCH = 'Opened Account Switcher',
  BROWSER_NAVIGATION = 'Browser Menu Navigation Used',
  BROWSER_SHARE_SITE = 'Shared A Site',
  BROWSER_RELOAD = 'Reload Browser',
  BROWSER_ADD_FAVORITES = 'Added Site To Favorites',
  BROWSER_SWITCH_TAB = 'Switched tab within Browser',
  BROWSER_OPENED_FULLSCREEN = 'Opened Fullscreen Browser Mode',
  BROWSER_CLOSED_FULLSCREEN = 'Exited Fullscreen Browser Mode',
  DAPP_VIEWED = 'Dapp Viewed',

  // Security & Privacy Settings
  VIEW_SECURITY_SETTINGS = 'Views Security & Privacy',
  BASIC_FUNCTIONALITY_ENABLED = 'Basic Functionality Enabled',
  BASIC_FUNCTIONALITY_DISABLED = 'Basic Functionality Disabled',

  // Settings
  SETTINGS_VIEWED = 'Settings Viewed',
  SETTINGS_UPDATED = 'Settings Updated',
  CURRENCY_CHANGED = 'Selected Currency Changed',

  // Reveal SRP
  REVEAL_SRP_CTA = 'Clicks Reveal Secret Recovery Phrase',
  REVEAL_SRP_SCREEN = 'Views Reveal Secret Recovery Phrase',
  GO_BACK_SRP_SCREEN = 'Clicked Back on Reveal SRP Password Page',
  CANCEL_REVEAL_SRP_CTA = 'Clicks Cancel on Reveal Secret Recovery Phrase Page',
  NEXT_REVEAL_SRP_CTA = 'Clicks Next on Reveal Secret Recovery Phrase',
  VIEW_SRP = 'Views SRP',
  SRP_DISMISS_HOLD_TO_REVEAL_DIALOG = 'Closes Hold To Reveal SRP',
  VIEW_SRP_QR = 'Views SRP QR code',
  COPY_SRP = 'Copies SRP to clipboard',
  SRP_DONE_CTA = 'Clicks Done with SRP',
  REVEAL_SRP_INITIATED = 'Reveal SRP Initiated',
  REVEAL_SRP_CANCELLED = 'Reveal SRP Cancelled',
  REVEAL_SRP_COMPLETED = 'Reveal SRP Completed',

  // Reveal Private Key
  REVEAL_PRIVATE_KEY_INITIATED = 'Reveal Private Key Initiated',
  REVEAL_PRIVATE_KEY_CANCELLED = 'Reveal Private Key Cancelled',
  REVEAL_PRIVATE_KEY_COMPLETED = 'Reveal Private Key Completed',

  // Key Management
  ANDROID_HARDWARE_KEYSTORE = 'Android Hardware Keystore',

  // QR Hardware Wallet
  CONNECT_HARDWARE_WALLET = 'Clicked Connect Hardware Wallet',
  CONTINUE_QR_HARDWARE_WALLET = 'Clicked Continue QR Hardware Wallet',
  CONNECT_HARDWARE_WALLET_SUCCESS = 'Connected Account with hardware wallet',
  QR_HARDWARE_TRANSACTION_CANCELED = 'User canceled QR hardware transaction',
  HARDWARE_WALLET_ERROR = 'Hardware wallet error',

  // Tokens
  TOKEN_DETECTED = 'Token Detected',
  TOKEN_IMPORT_CLICKED = 'Token Import Clicked',
  TOKEN_IMPORT_CANCELED = 'Token Import Canceled',
  TOKENS_HIDDEN = 'Tokens Hidden',
  EXTERNAL_LINK_CLICKED = 'External Link Clicked',

  // On Ramp
  BUY_BUTTON_CLICKED = 'Buy Button Clicked',
  RAMP_REGION_SELECTED = 'Ramp Region Selected',
  ONRAMP_GET_STARTED_CLICKED = 'On-ramp Get Started Clicked',
  ONRAMP_PAYMENT_METHOD_SELECTED = 'On-ramp Payment Method Selected',
  ONRAMP_CONTINUE_TO_AMOUNT_CLICKED = 'On-ramp Continue To Amount Clicked',
  ONRAMP_QUOTES_REQUESTED = 'On-ramp Quotes Requested',
  ONRAMP_CANCELED = 'On-ramp Canceled',
  ONRAMP_QUOTES_RECEIVED = 'On-ramp Quotes Received',
  ONRAMP_QUOTES_EXPANDED = 'On-ramp Quotes Expanded',
  ONRAMP_PROVIDER_SELECTED = 'On-ramp Provider Selected',
  ONRAMP_PROVIDER_DETAILS_VIEWED = 'On-ramp Provider Details Viewed',
  ONRAMP_DIRECT_PROVIDER_CLICKED = 'On-ramp Provider Custom Action Clicked',
  ONRAMP_PURCHASE_SUBMITTED = 'On-ramp Purchase Submitted',
  ONRAMP_PURCHASE_COMPLETED = 'On-ramp Purchase Completed',
  ONRAMP_PURCHASE_FAILED = 'On-ramp Purchase Failed',
  ONRAMP_PURCHASE_CANCELLED = 'On-ramp Purchase Cancelled',
  ONRAMP_PURCHASE_DETAILS_VIEWED = 'On-ramp Purchase Details Viewed',
  ONRAMP_EXTERNAL_LINK_CLICKED = 'On-ramp External Link Clicked',
  ONRAMP_QUOTE_ERROR = 'On-ramp Quote Error',
  ONRAMP_ERROR = 'On-ramp Error',
  ONRAMP_SETTINGS_CLICKED = 'On-ramp Settings Clicked',
  RAMP_REGION_RESET = 'Ramp Region Reset',

  // Off Ramp
  SELL_BUTTON_CLICKED = 'Sell Button Clicked',
  OFFRAMP_GET_STARTED_CLICKED = 'Off-ramp Get Started Clicked',
  OFFRAMP_PAYMENT_METHOD_SELECTED = 'Off-ramp Payment Method Selected',
  OFFRAMP_CONTINUE_TO_AMOUNT_CLICKED = 'Off-ramp Continue To Amount Clicked',
  OFFRAMP_QUOTES_REQUESTED = 'Off-ramp Quotes Requested',
  OFFRAMP_CANCELED = 'Off-ramp Canceled',
  OFFRAMP_QUOTES_RECEIVED = 'Off-ramp Quotes Received',
  OFFRAMP_QUOTES_EXPANDED = 'Off-ramp Quotes Expanded',
  OFFRAMP_PROVIDER_SELECTED = 'Off-ramp Provider Selected',
  OFFRAMP_PROVIDER_DETAILS_VIEWED = 'Off-ramp Provider Details Viewed',
  OFFRAMP_DIRECT_PROVIDER_CLICKED = 'Off-ramp Provider Custom Action Clicked',
  OFFRAMP_PURCHASE_SUBMITTED = 'Off-ramp Purchase Submitted',
  OFFRAMP_PURCHASE_COMPLETED = 'Off-ramp Purchase Completed',
  OFFRAMP_PURCHASE_FAILED = 'Off-ramp Purchase Failed',
  OFFRAMP_PURCHASE_CANCELLED = 'Off-ramp Purchase Cancelled',
  OFFRAMP_PURCHASE_DETAILS_VIEWED = 'Off-ramp Purchase Details Viewed',
  OFFRAMP_QUOTE_ERROR = 'Off-ramp Quote Error',
  OFFRAMP_ERROR = 'Off-ramp Error',
  OFFRAMP_SEND_CRYPTO_PROMPT_VIEWED = 'Off-ramp Send Crypto Prompt Viewed',
  OFFRAMP_SEND_TRANSACTION_INVOKED = 'Off-ramp Send Transaction Invoked',
  OFFRAMP_SEND_TRANSACTION_CONFIRMED = 'Off-ramp Send Transaction Confirmed',
  OFFRAMP_SEND_TRANSACTION_REJECTED = 'Off-ramp Send Transaction Rejected',

  // Deposit
  RAMP_PAYMENT_METHOD_CLICKED = 'Ramp Payment Method Clicked',
  RAMPS_BUTTON_CLICKED = 'Ramps Button Clicked',
  RAMPS_DEPOSIT_CASH_BUTTON_CLICKED = 'Ramps Deposit Cash Button Clicked',
  RAMPS_PAYMENT_METHOD_SELECTED = 'Ramps Payment Method Selected',
  RAMPS_TOKEN_SELECTOR_CLICKED = 'Ramps Token Selector Clicked',
  RAMPS_TOKEN_SELECTED = 'Ramps Token Selected',
  RAMPS_REGION_SELECTED = 'Ramps Region Selected',
  RAMPS_ORDER_PROPOSED = 'Ramps Order Proposed',
  RAMPS_ORDER_SELECTED = 'Ramps Order Selected',
  RAMPS_ORDER_FAILED = 'Ramps Order Failed',
  RAMPS_EMAIL_SUBMITTED = 'Ramps Email Submitted',
  RAMPS_OTP_CONFIRMED = 'Ramps OTP Confirmed',
  RAMPS_OTP_FAILED = 'Ramps OTP Failed',
  RAMPS_OTP_RESENT = 'Ramps OTP Resent',
  RAMPS_KYC_STARTED = 'Ramps KYC Started',
  RAMPS_BASIC_INFO_ENTERED = 'Ramps Basic Info Entered',
  RAMPS_ADDRESS_ENTERED = 'Ramps Address Entered',
  RAMPS_TRANSACTION_CONFIRMED = 'Ramps Transaction Confirmed',
  RAMPS_TRANSACTION_COMPLETED = 'Ramps Transaction Completed',
  RAMPS_TRANSACTION_FAILED = 'Ramps Transaction Failed',
  RAMPS_KYC_APPLICATION_FAILED = 'Ramps KYC Application Failed',
  RAMPS_KYC_APPLICATION_APPROVED = 'Ramps KYC Application Approved',
  RAMPS_PAYMENT_METHOD_ADDED = 'Ramps Payment Method Added',
  RAMPS_USER_DETAILS_FETCHED = 'Ramps User Details Fetched',

  ACCOUNTS = 'Accounts',
  DAPP_VIEW = 'Dapp View',
  NAVIGATION_DRAWER = 'Navigation Drawer',
  ONBOARDING = 'Onboarding',
  SETTINGS = 'Settings',
  TRANSACTIONS = 'Transactions',
  WALLET_VIEW = 'Wallet View',
  RECEIVE_OPTIONS = 'Receive Options',
  SEND_FLOW = 'Send Flow',
  SEND = 'Send',
  DAPP_INTERACTIONS = 'Dapp Interactions',

  // Send Flow
  SEND_ASSET_SELECTED = 'Send Asset Selected',
  SEND_STARTED = 'Send Started',
  SEND_AMOUNT_SELECTED = 'Send Amount Selected',
  SEND_RECIPIENT_SELECTED = 'Send Recipient Selected',
  SEND_EXIT = 'Send Flow Exited',

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

  // Bridge
  BRIDGE_LINK_CLICKED = 'Bridge Linked Clicked',
  SWAP_PAGE_VIEWED = 'Unified SwapBridge Page Viewed',

  // Earn
  EARN_EMPTY_STATE_CTA_CLICKED = 'Earn Empty State CTA Clicked',
  EARN_LEARN_MORE_CLICKED = 'Earn Learn More Clicked',
  EARN_DEPOSIT_REVIEW_CANCEL_CLICKED = 'Earn Deposit Review Cancel Clicked',
  EARN_DEPOSIT_REVIEW_CONFIRM_CLICKED = 'Earn Deposit Review Confirm Clicked',
  EARN_ACTION_BUTTON_CLICKED = 'Earn Action button clicked',
  EARN_INPUT_OPENED = 'Earn input opened',
  EARN_INPUT_BACK_BUTTON_CLICKED = 'Earn Input Back Button Clicked',
  EARN_INPUT_VALUE_CHANGED = 'Input value changed',
  EARN_REVIEW_BUTTON_CLICKED = 'Earn Review button clicked',
  EARN_CONFIRMATION_PAGE_VIEWED = 'Earn confirmation page viewed',
  EARN_ACTION_SUBMITTED = 'Earn Action submitted',
  EARN_TRANSACTION_INITIATED = 'Earn Transaction Initiated',
  EARN_TRANSACTION_APPROVED = 'Earn Transaction Approved',
  EARN_TRANSACTION_REJECTED = 'Earn Transaction Rejected',
  EARN_TRANSACTION_SUBMITTED = 'Earn Transaction Submitted',
  EARN_TRANSACTION_CONFIRMED = 'Earn Transaction Confirmed',
  EARN_TRANSACTION_FAILED = 'Earn Transaction Failed',
  EARN_TRANSACTION_DROPPED = 'Earn Transaction Dropped',
  EARN_WITHDRAWAL_REVIEW_CANCEL_CLICKED = 'Earn Withdrawal Review Cancel Clicked',
  EARN_LENDING_FAQ_LINK_OPENED = 'Earn Lending FAQ Link Opened',
  EARN_INPUT_INSUFFICIENT_BALANCE = 'Earn Input Insufficient Balance',
  EARN_INPUT_CURRENCY_SWITCH_CLICKED = 'Earn Input Currency Switch Clicked',
  EARN_LENDING_DEPOSIT_MORE_BUTTON_CLICKED = 'Earn Lending Deposit More Button Clicked',
  EARN_LENDING_WITHDRAW_BUTTON_CLICKED = 'Earn Lending Withdraw Button Clicked',
  EARN_LENDING_WITHDRAW_CONFIRMATION_BACK_CLICKED = 'Earn Lending Withdraw Confirmation Back Clicked',

  // Stake
  STAKE_BUTTON_CLICKED = 'Stake Button Clicked',
  REVIEW_STAKE_BUTTON_CLICKED = 'Review Stake Button Clicked',
  REVIEW_UNSTAKE_BUTTON_CLICKED = 'Review Unstake Button Clicked',
  STAKE_INPUT_QUICK_AMOUNT_CLICKED = 'Stake Input Quick Amount Clicked',
  UNSTAKE_INPUT_QUICK_AMOUNT_CLICKED = 'Unstake Input Quick Amount Clicked',
  STAKE_WITHDRAW_BUTTON_CLICKED = 'Stake Withdraw Button Clicked',
  STAKE_CLAIM_BUTTON_CLICKED = 'Stake Claim Button Clicked',
  STAKE_LEARN_MORE_CLICKED = 'Stake Learn More Clicked',
  STAKE_CANCEL_CLICKED = 'Stake Cancel Clicked',
  STAKE_CONFIRMATION_BACK_CLICKED = 'Stake Confirmation Back Clicked',
  STAKE_TRANSACTION_INITIATED = 'Stake Transaction Initiated',
  STAKE_TRANSACTION_APPROVED = 'Stake Transaction Approved',
  STAKE_TRANSACTION_REJECTED = 'Stake Transaction Rejected',
  STAKE_TRANSACTION_FAILED = 'Stake Transaction Failed',
  STAKE_TRANSACTION_SUBMITTED = 'Stake Transaction Submitted',
  STAKE_TRANSACTION_CONFIRMED = 'Stake Transaction Confirmed',
  STAKE_GAS_COST_IMPACT_WARNING_TRIGGERED = 'Stake Gas Cost Impact Warning Triggered',
  STAKE_GAS_COST_IMPACT_CANCEL_CLICKED = 'Stake Gas Cost Impact Cancel Clicked',
  STAKE_GAS_COST_IMPACT_PROCEEDED_CLICKED = 'Stake Gas Cost Impact Proceeded Clicked',
  UNSTAKE_INPUT_CURRENCY_SWITCH_CLICKED = 'Unstake Input Currency Switch Clicked',
  UNSTAKE_CANCEL_CLICKED = 'Unstake Cancel Clicked',
  UNSTAKE_TRANSACTION_INITIATED = 'Unstake Transaction Initiated',
  UNSTAKE_CONFIRMATION_BACK_CLICKED = 'Unstake Confirmation Back Clicked',
  UNSTAKE_TRANSACTION_APPROVED = 'Unstake Transaction Approved',
  UNSTAKE_TRANSACTION_REJECTED = 'Unstake Transaction Rejected',
  UNSTAKE_TRANSACTION_FAILED = 'Unstake Transaction Failed',
  UNSTAKE_TRANSACTION_CONFIRMED = 'Unstake Transaction Confirmed',
  UNSTAKE_TRANSACTION_SUBMITTED = 'Unstake Transaction Submitted',
  VISITED_ETH_OVERVIEW_WITH_STAKED_POSITIONS = 'Visited ETH Overview with Staked Positions',
  EARN_TOKEN_LIST_ITEM_CLICKED = 'Earn Token List Item Clicked',

  // Force Upgrade | Automatic Security Checks
  FORCE_UPGRADE_UPDATE_NEEDED_PROMPT_VIEWED = 'Force Upgrade Update Needed Prompt Viewed',
  FORCE_UPGRADE_UPDATE_TO_THE_LATEST_VERSION_CLICKED = 'Force Upgrade Clicked Update to Latest Version',
  FORCE_UPGRADE_REMIND_ME_LATER_CLICKED = 'Force Upgrade Clicked Remind Me Later',
  AUTOMATIC_SECURITY_CHECKS_PROMPT_VIEWED = 'Automatic Security Checks Prompt Viewed',
  AUTOMATIC_SECURITY_CHECKS_ENABLED_FROM_PROMPT = 'Automatic Security Checks Enabled From Prompt',
  AUTOMATIC_SECURITY_CHECKS_DISABLED_FROM_PROMPT = 'Automatic Security Checks Disabled From Prompt',
  AUTOMATIC_SECURITY_CHECKS_ENABLED_FROM_SETTINGS = 'Automatic Security Checks Enabled From Settings',
  AUTOMATIC_SECURITY_CHECKS_DISABLED_FROM_SETTINGS = 'Automatic Security Checks Disabled From Settings',

  // Screenshots Deterrent
  SCREENSHOT_WARNING = 'Screenshot Warning Displayed',
  SCREENSHOT_LEARN_MORE = 'Clicked Screenshot Warning Learn More',
  SCREENSHOT_OK = 'Clicked Screenshot Warning OK',
  SRP_SCREENSHOT_ATTEMPTED = 'SRP Screenshot Attempted',

  //Terms of Use
  USER_TERMS_SHOWN = 'Terms of Use Shown',
  USER_TERMS_ACCEPTED = 'Terms of Use Accepted',
  // Reveal SRP Quiz
  SRP_REVEAL_QUIZ_PROMPT_SEEN = 'SRP reveal quiz prompt seen',
  SRP_REVEAL_START_CTA_SELECTED = 'SRP reveal get started CTA selected',
  SRP_REVEAL_FIRST_QUESTION_SEEN = 'SRP reveal first question seen',
  SRP_REVEAL_FIRST_QUESTION_WRONG_ANSWER = 'SRP reveal first question answered incorrectly',
  SRP_REVEAL_FIRST_QUESTION_RIGHT_ASNWER = 'SRP reveal first question answered correctly',
  SRP_REVEAL_SECOND_QUESTION_SEEN = 'SRP reveal second question seen',
  SRP_REVEAL_SECOND_QUESTION_WRONG_ANSWER = 'SRP reveal second question answered incorrectly',
  SRP_REVEAL_SECOND_QUESTION_RIGHT_ASNWER = 'SRP reveal second question answered correctly',

  OPEN_DAPP_PERMISSIONS = 'Viewed dapp permissions',
  CHANGE_DAPP_PERMISSIONS = 'Changed dapp permissions',

  // Vault Corruption
  VAULT_CORRUPTION_DETECTED = 'Vault Corruption Detected',
  VAULT_CORRUPTION_RESTORE_WALLET_SCREEN_VIEWED = 'Vault Corruption Restore Wallet Screen Viewed',
  VAULT_CORRUPTION_RESTORE_WALLET_BUTTON_PRESSED = 'Vault Corruption Restore Wallet Button Pressed',
  VAULT_CORRUPTION_WALLET_SUCCESSFULLY_RESTORED_SCREEN_VIEWED = 'Vault Corruption Wallet Successfully Restored Screen Viewed',
  VAULT_CORRUPTION_WALLET_SUCCESSFULLY_RESTORED_CONTINUE_BUTTON_PRESSED = 'Vault Corruption Wallet Successfully Restored Continue To Wallet Button Pressed',
  VAULT_CORRUPTION_WALLET_RESET_NEEDED_SCREEN_VIEWED = 'Vault Corruption Wallet Reset Needed Screen Viewed',
  VAULT_CORRUPTION_WALLET_RESET_NEEDED_TRY_AGAIN_BUTTON_PRESSED = 'Vault Corruption Wallet Reset Needed Try Again Button Pressed',
  VAULT_CORRUPTION_WALLET_RESET_NEEDED_CREATE_NEW_WALLET_BUTTON_PRESSED = 'Vault Corruption Wallet Reset Needed Create A New Wallet Button Pressed',

  // Login screen
  LOGIN_SCREEN_VIEWED = 'Login Screen Viewed',

  // Reset Wallet Confirmed Modal
  RESET_WALLET_CONFIRMED = 'Reset Wallet Confirmed',

  // Tab Bar Actions
  ACTIONS_BUTTON_CLICKED = 'Global Actions Button Clicked',
  RECEIVE_BUTTON_CLICKED = 'Receive Button Clicked',
  SWAP_BUTTON_CLICKED = 'Unified SwapBridge Button Clicked',
  SEND_BUTTON_CLICKED = 'Send Button Clicked',
  ACTION_BUTTON_CLICKED = 'Action Button Clicked',
  EARN_BUTTON_CLICKED = 'Earn Button Clicked',
  // Edit account name
  ACCOUNT_RENAMED = 'Account Renamed',

  //Ledger
  CONNECT_LEDGER = 'Clicked Connect Ledger',
  CONTINUE_LEDGER_HARDWARE_WALLET = 'Clicked Continue Ledger Hardware Wallet',
  CONNECT_LEDGER_SUCCESS = 'Connected Account with hardware wallet',
  LEDGER_HARDWARE_TRANSACTION_CANCELLED = 'User canceled Ledger hardware transaction',
  LEDGER_HARDWARE_WALLET_ERROR = 'Ledger hardware wallet error',

  // common hardware wallet
  HARDWARE_WALLET_FORGOTTEN = 'Hardware wallet forgotten',

  // Remove an account
  ACCOUNT_REMOVED = 'Account removed',
  ACCOUNT_REMOVE_FAILED = 'Account remove failed',
  // Account added
  ACCOUNT_ADDED = 'Account Added',
  // Multi SRP
  IMPORT_SECRET_RECOVERY_PHRASE_CLICKED = 'Import Secret Recovery Phrase Clicked',
  IMPORT_SECRET_RECOVERY_PHRASE_COMPLETED = 'Import Secret Recovery Phrase Completed',
  SECRET_RECOVERY_PHRASE_PICKER_CLICKED = 'Secret Recovery Phrase Picker Clicked',

  // Notifications
  ALL_NOTIFICATIONS = 'All Notifications',
  WALLET_NOTIFICATIONS = 'Wallet Notifications',
  ANNOUCEMENTS_NOTIFICATIONS = 'Annoucements Notifications',
  NOTIFICATIONS_ACTIVATED = 'Notifications Activated',
  NOTIFICATIONS_MENU_OPENED = 'Notifications Menu Opened',
  NOTIFICATION_CLICKED = 'Notification Clicked',
  NOTIFICATIONS_MARKED_ALL_AS_READ = 'Notifications Marked All as Read',
  NOTIFICATION_DETAIL_CLICKED = 'Notification Detail Clicked',

  // Push Notifications
  PUSH_NOTIFICATION_RECEIVED = 'Push Notification Received',
  PUSH_NOTIFICATION_CLICKED = 'Push Notification Clicked',

  // Smart transactions
  SMART_TRANSACTION_OPT_IN = 'Smart Transaction Opt In',

  // Smart account opt in
  SMART_ACCOUNT_OPT_IN = 'Smart Account Opt In',

  // Dismiss smart account upgrade suggestion
  DISMISS_SMART_ACCOUNT_SUGGESTION_ENABLED = 'Dismiss smart account suggestion enabled',

  // Simulations
  INCOMPLETE_ASSET_DISPLAYED = 'Incomplete Asset Displayed',

  LOGIN_DOWNLOAD_LOGS = 'Download State Logs Button Clicked',

  // Backup and sync
  ACCOUNTS_SYNC_ADDED = 'Accounts Sync Added',
  ACCOUNTS_SYNC_NAME_UPDATED = 'Accounts Sync Name Updated',
  ACCOUNTS_SYNC_ERRONEOUS_SITUATION = 'Accounts Sync Erroneous Situation',
  PROFILE_ACTIVITY_UPDATED = 'Profile Activity Updated',
  // network
  MULTI_RPC_MIGRATION_MODAL_ACCEPTED = 'multi_rpc_migration_modal_accepted',

  // Connection
  CONNECTION_DROPPED = 'Connection dropped',
  CONNECTION_RESTORED = 'Connection restored',

  // Tooltip
  TOOLTIP_OPENED = 'Tooltip Opened',

  // RPC Failover
  RPC_SERVICE_UNAVAILABLE = 'RPC Service Unavailable',
  RPC_SERVICE_DEGRADED = 'RPC Service Degraded',

  // NETWORK CONNECTION BANNER
  NETWORK_CONNECTION_BANNER_SHOWN = 'Network Connection Banner Shown',
  NETWORK_CONNECTION_BANNER_UPDATE_RPC_CLICKED = 'Network Connection Banner Update RPC Clicked',
  NetworkConnectionBannerRpcUpdated = 'Network Connection Banner RPC Updated',

  // Deep Link Modal Viewed
  DEEP_LINK_PRIVATE_MODAL_VIEWED = 'Deep Link Private Modal Viewed',
  DEEP_LINK_PUBLIC_MODAL_VIEWED = 'Deep Link Public Modal Viewed',
  DEEP_LINK_INVALID_MODAL_VIEWED = 'Deep Link Invalid Modal Viewed',
  DEEP_LINK_UNSUPPORTED_MODAL_VIEWED = 'Deep Link Unsupported Modal Viewed',
  DEEP_LINK_PRIVATE_MODAL_DISMISSED = 'Deep Link Private Modal Dismissed',
  DEEP_LINK_PUBLIC_MODAL_DISMISSED = 'Deep Link Public Modal Dismissed',
  DEEP_LINK_INVALID_MODAL_DISMISSED = 'Deep Link Invalid Modal Dismissed',
  DEEP_LINK_UNSUPPORTED_MODAL_DISMISSED = 'Deep Link Unsupported Modal Dismissed',
  DEEP_LINK_PRIVATE_MODAL_CONTINUE_CLICKED = 'Deep Link Private Modal Continue Clicked',
  DEEP_LINK_PUBLIC_MODAL_CONTINUE_CLICKED = 'Deep Link Public Modal Continue Clicked',
  DEEP_LINK_MODAL_PRIVATE_DONT_REMIND_ME_AGAIN_CHECKBOX_CHECKED = 'Deep Link Modal Private Dont Remind Me Again Checkbox Checked',
  DEEP_LINK_MODAL_PRIVATE_DONT_REMIND_ME_AGAIN_CHECKBOX_UNCHECKED = 'Deep Link Modal Private Dont Remind Me Again Checkbox Unchecked',

  // What's New Link Clicked
  WHATS_NEW_LINK_CLICKED = "What's New Link Clicked",

  // Perps Trading
  // Perps Events - Consolidated
  PERPS_WITHDRAWAL_TRANSACTION = 'Perp Withdrawal Transaction',
  PERPS_TRADE_TRANSACTION = 'Perp Trade Transaction',
  PERPS_POSITION_CLOSE_TRANSACTION = 'Perp Position Close Transaction',
  PERPS_ORDER_CANCEL_TRANSACTION = 'Perp Order Cancel Transaction',
  PERPS_SCREEN_VIEWED = 'Perp Screen Viewed',
  PERPS_UI_INTERACTION = 'Perp UI Interaction',
  PERPS_RISK_MANAGEMENT = 'Perp Risk Management',
  PERPS_ERROR = 'Perp Error',

  // Card
  CARD_BUTTON_VIEWED = 'Card Button Viewed',
  CARD_HOME_CLICKED = 'Card Home Clicked',
  CARD_HOME_VIEWED = 'Card Home Viewed',
  CARD_ADD_FUNDS_CLICKED = 'Card Add Funds Clicked',
  CARD_ADD_FUNDS_SWAPS_CLICKED = 'Card Add Funds Swaps Clicked',
  CARD_ADD_FUNDS_DEPOSIT_CLICKED = 'Card Add Funds Deposit Clicked',
  CARD_ADVANCED_CARD_MANAGEMENT_CLICKED = 'Card Advanced Card Management Clicked',
  CARD_VIEWED = 'Card Viewed',
  CARD_BUTTON_CLICKED = 'Card Button Clicked',
  CARD_DELEGATION_PROCESS_STARTED = 'Card Delegation Process Started',
  CARD_DELEGATION_PROCESS_COMPLETED = 'Card Delegation Process Completed',
  CARD_DELEGATION_PROCESS_FAILED = 'Card Delegation Process Failed',
  CARD_DELEGATION_PROCESS_USER_CANCELED = 'Card Delegation Process User Canceled',
  // Rewards
  REWARDS_ACCOUNT_LINKING_STARTED = 'Rewards Account Linking Started',
  REWARDS_ACCOUNT_LINKING_COMPLETED = 'Rewards Account Linking Completed',
  REWARDS_ACCOUNT_LINKING_FAILED = 'Rewards Account Linking Failed',
  REWARDS_ACTIVE_BOOST_CLICKED = 'Rewards Active Boost Clicked',
  REWARDS_DASHBOARD_TAB_VIEWED = 'Rewards Dashboard Tab Viewed',
  REWARDS_DASHBOARD_VIEWED = 'Rewards Dashboard Viewed',
  REWARDS_ONBOARDING_STARTED = 'Rewards Onboarding Started',
  REWARDS_ONBOARDING_COMPLETED = 'Rewards Onboarding Completed',
  REWARDS_OPT_IN_STARTED = 'Rewards Opt In Started',
  REWARDS_OPT_IN_COMPLETED = 'Rewards Opt In Completed',
  REWARDS_OPT_IN_FAILED = 'Rewards Opt In Failed',
  REWARDS_OPT_OUT_STARTED = 'Rewards Opt Out Started',
  REWARDS_OPT_OUT_COMPLETED = 'Rewards Opt Out Completed',
  REWARDS_OPT_OUT_FAILED = 'Rewards Opt Out Failed',
  REWARDS_PAGE_BUTTON_CLICKED = 'Rewards Page Button Clicked',
  REWARDS_REFERRALS_VIEWED = 'Rewards Referrals Viewed',
  REWARDS_REWARD_CLAIMED = 'Rewards Reward Claimed',
  REWARDS_REWARD_VIEWED = 'Rewards Reward Viewed',
  REWARDS_SETTINGS_VIEWED = 'Rewards Settings Viewed',
  REWARDS_WAYS_TO_EARN_CTA_CLICKED = 'Rewards Ways to Earn CTA Clicked',

  // Predict
  PREDICT_TRADE_TRANSACTION = 'Predict Trade Transaction',
  PREDICT_MARKET_DETAILS_OPENED = 'Predict Market Details Opened',
  PREDICT_POSITION_VIEWED = 'Predict Position Viewed',
  PREDICT_ACTIVITY_VIEWED = 'Predict Activity Viewed',
  PREDICT_GEO_BLOCKED_TRIGGERED = 'Geo Blocked Triggered',
  PREDICT_FEED_VIEWED = 'Predict Feed Viewed',

  // Share
  SHARE_ACTION = 'Share Action',

  // QR Scanner
  QR_SCANNER_OPENED = 'QR Scanner Opened',
  QR_SCANNED = 'QR Scanned',
}

enum ACTIONS {
  // Navigation Drawer
  NAVIGATION_DRAWER = 'Navigation Drawer',
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
  CONNECT = 'Connect',
  // Settings
  SETTINGS = 'Settings',
  // Receive Options
  RECEIVE_OPTIONS = 'Receive Options',
  // Send Flow
  SEND_FLOW = 'Send Flow',
  // Re-designed send
  SEND = 'Send',
  // Dapp Interactions
  APPROVE_REQUEST = 'Approve Request',
  // Swaps
  QUOTE = 'Quote',
  SWAP = 'Swap',
  BRIDGE = 'Bridge',
  PERMISSION_NEW_ACCOUNT = 'Connected new account(s)',
  PERMISSION_REVOKE_ACCOUNT = 'Revoked account(s)',
  STAKE = 'Stake',
  // Notifications
  SELECTS_ALL_NOTIFICATIONS = 'Selects All Notifications',
  SELECTS_WALLET_NOTIFICATIONS = 'Selects Wallet Notifications',
  SELECTS_ANNOUCEMENTS_NOTIFICATIONS = 'Selects Annoucements Notifications',
}

const events = {
  APP_OPENED: generateOpt(EVENT_NAME.APP_OPENED),
  ERROR_SCREEN_VIEWED: generateOpt(EVENT_NAME.ERROR_SCREEN_VIEWED),

  ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
  // Sample feature
  SETTINGS_SAMPLE_FEATURE: generateOpt(EVENT_NAME.SETTINGS_SAMPLE_FEATURE),
  ///: END:ONLY_INCLUDE_IF

  // Approval
  APPROVAL_STARTED: generateOpt(EVENT_NAME.APPROVAL_STARTED),
  APPROVAL_COMPLETED: generateOpt(EVENT_NAME.APPROVAL_COMPLETED),
  APPROVAL_CANCELLED: generateOpt(EVENT_NAME.APPROVAL_CANCELLED),
  APPROVAL_PERMISSION_UPDATED: generateOpt(
    EVENT_NAME.APPROVAL_PERMISSION_UPDATED,
  ),
  GAS_FEE_CHANGED: generateOpt(EVENT_NAME.GAS_FEES_CHANGED),
  GAS_ADVANCED_OPTIONS_CLICKED: generateOpt(
    EVENT_NAME.GAS_ADVANCED_OPTIONS_CLICKED,
  ),
  DAPP_TRANSACTION_STARTED: generateOpt(EVENT_NAME.DAPP_TRANSACTION_STARTED),
  DAPP_TRANSACTION_COMPLETED: generateOpt(
    EVENT_NAME.DAPP_TRANSACTION_COMPLETED,
  ),
  DAPP_TRANSACTION_CANCELLED: generateOpt(
    EVENT_NAME.DAPP_TRANSACTION_CANCELLED,
  ),
  CONTRACT_ADDRESS_COPIED: generateOpt(EVENT_NAME.CONTRACT_ADDRESS_COPIED),
  CONTRACT_ADDRESS_NICKNAME: generateOpt(EVENT_NAME.CONTRACT_ADDRESS_NICKNAME),
  SIGNATURE_REQUESTED: generateOpt(EVENT_NAME.SIGNATURE_REQUESTED),
  SIGNATURE_APPROVED: generateOpt(EVENT_NAME.SIGNATURE_APPROVED),
  SIGNATURE_REJECTED: generateOpt(EVENT_NAME.SIGNATURE_REJECTED),
  CONNECT_REQUEST_STARTED: generateOpt(EVENT_NAME.CONNECT_REQUEST_STARTED),
  CONNECT_REQUEST_COMPLETED: generateOpt(EVENT_NAME.CONNECT_REQUEST_COMPLETED),
  CONNECT_REQUEST_OTPFAILURE: generateOpt(
    EVENT_NAME.CONNECT_REQUEST_OTPFAILURE,
  ),
  CONNECT_REQUEST_CANCELLED: generateOpt(EVENT_NAME.CONNECT_REQUEST_CANCELLED),

  // Phishing events
  PHISHING_PAGE_DISPLAYED: generateOpt(EVENT_NAME.PHISHING_PAGE_DISPLAYED),
  PROCEED_ANYWAY_CLICKED: generateOpt(EVENT_NAME.PROCEED_ANYWAY_CLICKED),

  WALLET_OPENED: generateOpt(EVENT_NAME.WALLET_OPENED),
  TOKEN_ADDED: generateOpt(EVENT_NAME.TOKEN_ADDED),
  COLLECTIBLE_ADDED: generateOpt(EVENT_NAME.COLLECTIBLE_ADDED),
  NFT_DETAILS_OPENED: generateOpt(EVENT_NAME.NFT_DETAILS_OPENED),
  DEFI_TAB_SELECTED: generateOpt(EVENT_NAME.DEFI_TAB_SELECTED),
  DEFI_PROTOCOL_DETAILS_OPENED: generateOpt(
    EVENT_NAME.DEFI_PROTOCOL_DETAILS_OPENED,
  ),
  VIEW_ALL_ASSETS_CLICKED: generateOpt(EVENT_NAME.VIEW_ALL_ASSETS_CLICKED),
  CURRENCY_CHANGED: generateOpt(EVENT_NAME.CURRENCY_CHANGED),
  NETWORK_SWITCHED: generateOpt(EVENT_NAME.NETWORK_SWITCHED),
  NETWORK_ADDED: generateOpt(EVENT_NAME.NETWORK_ADDED),
  NETWORK_REQUESTED: generateOpt(EVENT_NAME.NETWORK_REQUESTED),
  NETWORK_REQUEST_REJECTED: generateOpt(EVENT_NAME.NETWORK_REQUEST_REJECTED),
  SEND_TRANSACTION_STARTED: generateOpt(EVENT_NAME.SEND_TRANSACTION_STARTED),
  SEND_TRANSACTION_COMPLETED: generateOpt(
    EVENT_NAME.SEND_TRANSACTION_COMPLETED,
  ),
  EXTERNAL_LINK_CLICKED: generateOpt(EVENT_NAME.EXTERNAL_LINK_CLICKED),

  PORTFOLIO_LINK_CLICKED: generateOpt(EVENT_NAME.PORTFOLIO_LINK_CLICKED),
  LINK_CLICKED: generateOpt(EVENT_NAME.LINK_CLICKED),
  WALLET_SECURITY_STARTED: generateOpt(EVENT_NAME.WALLET_SECURITY_STARTED),
  WALLET_SECURITY_MANUAL_BACKUP_INITIATED: generateOpt(
    EVENT_NAME.WALLET_SECURITY_MANUAL_BACKUP_INITIATED,
  ),
  WALLET_SECURITY_PHRASE_REVEALED: generateOpt(
    EVENT_NAME.WALLET_SECURITY_PHRASE_REVEALED,
  ),
  WALLET_SECURITY_PHRASE_CONFIRMED: generateOpt(
    EVENT_NAME.WALLET_SECURITY_PHRASE_CONFIRMED,
  ),
  WALLET_SECURITY_SKIP_INITIATED: generateOpt(
    EVENT_NAME.WALLET_SECURITY_SKIP_INITIATED,
  ),
  WALLET_SECURITY_SKIP_CONFIRMED: generateOpt(
    EVENT_NAME.WALLET_SECURITY_SKIP_CONFIRMED,
  ),
  WALLET_SECURITY_SKIP_CANCELED: generateOpt(
    EVENT_NAME.WALLET_SECURITY_SKIP_CANCELED,
  ),
  WALLET_SECURITY_RECOVERY_HINT_SAVED: generateOpt(
    EVENT_NAME.WALLET_SECURITY_RECOVERY_HINT_SAVED,
  ),
  WALLET_SECURITY_COMPLETED: generateOpt(EVENT_NAME.WALLET_SECURITY_COMPLETED),
  WALLET_SECURITY_PROTECT_VIEWED: generateOpt(
    EVENT_NAME.WALLET_SECURITY_PROTECT_VIEWED,
  ),
  WALLET_SECURITY_PROTECT_ENGAGED: generateOpt(
    EVENT_NAME.WALLET_SECURITY_PROTECT_ENGAGED,
  ),
  WALLET_SECURITY_PROTECT_DISMISSED: generateOpt(
    EVENT_NAME.WALLET_SECURITY_PROTECT_DISMISSED,
  ),
  SRP_DEFINITION_CLICKED: generateOpt(EVENT_NAME.SRP_DEFINITION_CLICKED),
  ANALYTICS_PREFERENCE_SELECTED: generateOpt(
    EVENT_NAME.ANALYTICS_PREFERENCE_SELECTED,
  ),
  ANALYTICS_REQUEST_DATA_DELETION: generateOpt(
    EVENT_NAME.ANALYTICS_REQUEST_DATA_DELETION,
  ),
  ONBOARDING_WELCOME_MESSAGE_VIEWED: generateOpt(
    EVENT_NAME.ONBOARDING_WELCOME_MESSAGE_VIEWED,
  ),
  ONBOARDING_WELCOME_SCREEN_ENGAGEMENT: generateOpt(
    EVENT_NAME.ONBOARDING_WELCOME_SCREEN_ENGAGEMENT,
  ),
  ONBOARDING_STARTED: generateOpt(EVENT_NAME.ONBOARDING_STARTED),
  ONBOARDING_TOUR_STARTED: generateOpt(EVENT_NAME.ONBOARDING_TOUR_STARTED),
  ONBOARDING_TOUR_SKIPPED: generateOpt(EVENT_NAME.ONBOARDING_TOUR_SKIPPED),
  ONBOARDING_TOUR_STEP_COMPLETED: generateOpt(
    EVENT_NAME.ONBOARDING_TOUR_STEP_COMPLETED,
  ),
  ONBOARDING_TOUR_STEP_REVISITED: generateOpt(
    EVENT_NAME.ONBOARDING_TOUR_STEP_REVISITED,
  ),
  ONBOARDING_TOUR_COMPLETED: generateOpt(EVENT_NAME.ONBOARDING_TOUR_COMPLETED),
  WALLET_SETUP_STARTED: generateOpt(EVENT_NAME.WALLET_SETUP_STARTED),
  WALLET_IMPORT_STARTED: generateOpt(EVENT_NAME.WALLET_IMPORT_STARTED),
  WALLET_IMPORT_ATTEMPTED: generateOpt(EVENT_NAME.WALLET_IMPORT_ATTEMPTED),
  WALLET_IMPORTED: generateOpt(EVENT_NAME.WALLET_IMPORTED),
  WALLET_CREATION_ATTEMPTED: generateOpt(EVENT_NAME.WALLET_CREATION_ATTEMPTED),
  WALLET_CREATED: generateOpt(EVENT_NAME.WALLET_CREATED),
  WALLET_SETUP_FAILURE: generateOpt(EVENT_NAME.WALLET_SETUP_FAILURE),
  WALLET_SETUP_COMPLETED: generateOpt(EVENT_NAME.WALLET_SETUP_COMPLETED),
  SOCIAL_LOGIN_COMPLETED: generateOpt(EVENT_NAME.SOCIAL_LOGIN_COMPLETED),
  SOCIAL_LOGIN_FAILED: generateOpt(EVENT_NAME.SOCIAL_LOGIN_FAILED),
  ACCOUNT_ALREADY_EXISTS_PAGE_VIEWED: generateOpt(
    EVENT_NAME.ACCOUNT_ALREADY_EXISTS_PAGE_VIEWED,
  ),
  ACCOUNT_NOT_FOUND_PAGE_VIEWED: generateOpt(
    EVENT_NAME.ACCOUNT_NOT_FOUND_PAGE_VIEWED,
  ),
  WHATS_NEW_LINK_CLICKED: generateOpt(EVENT_NAME.WHATS_NEW_LINK_CLICKED),
  REHYDRATION_PASSWORD_ATTEMPTED: generateOpt(
    EVENT_NAME.REHYDRATION_PASSWORD_ATTEMPTED,
  ),
  REHYDRATION_COMPLETED: generateOpt(EVENT_NAME.REHYDRATION_COMPLETED),
  REHYDRATION_PASSWORD_FAILED: generateOpt(
    EVENT_NAME.REHYDRATION_PASSWORD_FAILED,
  ),
  PASSWORD_CHANGED: generateOpt(EVENT_NAME.PASSWORD_CHANGED),
  FORGOT_PASSWORD_CLICKED: generateOpt(EVENT_NAME.FORGOT_PASSWORD_CLICKED),
  USE_DIFFERENT_LOGIN_METHOD_CLICKED: generateOpt(
    EVENT_NAME.USE_DIFFERENT_LOGIN_METHOD_CLICKED,
  ),
  RESET_WALLET: generateOpt(EVENT_NAME.RESET_WALLET),
  SWITCHED_ACCOUNT: generateOpt(EVENT_NAME.SWITCHED_ACCOUNT),
  BROWSER_OPENED: generateOpt(EVENT_NAME.BROWSER_OPENED),
  BROWSER_SEARCH_USED: generateOpt(EVENT_NAME.BROWSER_SEARCH_USED),
  BROWSER_NEW_TAB: generateOpt(EVENT_NAME.BROWSER_NEW_TAB),
  BROWSER_OPEN_ACCOUNT_SWITCH: generateOpt(
    EVENT_NAME.BROWSER_OPEN_ACCOUNT_SWITCH,
  ),
  BROWSER_NAVIGATION: generateOpt(EVENT_NAME.BROWSER_NAVIGATION),
  BROWSER_SHARE_SITE: generateOpt(EVENT_NAME.BROWSER_SHARE_SITE),
  BROWSER_RELOAD: generateOpt(EVENT_NAME.BROWSER_RELOAD),
  BROWSER_ADD_FAVORITES: generateOpt(EVENT_NAME.BROWSER_ADD_FAVORITES),
  BROWSER_OPENED_FULLSCREEN: generateOpt(EVENT_NAME.BROWSER_OPENED_FULLSCREEN),
  BROWSER_CLOSED_FULLSCREEN: generateOpt(EVENT_NAME.BROWSER_CLOSED_FULLSCREEN),
  DAPP_VIEWED: generateOpt(EVENT_NAME.DAPP_VIEWED),
  TOOLTIP_OPENED: generateOpt(EVENT_NAME.TOOLTIP_OPENED),
  // Security & Privacy Settings
  VIEW_SECURITY_SETTINGS: generateOpt(EVENT_NAME.VIEW_SECURITY_SETTINGS),
  BASIC_FUNCTIONALITY_ENABLED: generateOpt(
    EVENT_NAME.BASIC_FUNCTIONALITY_ENABLED,
  ),
  BASIC_FUNCTIONALITY_DISABLED: generateOpt(
    EVENT_NAME.BASIC_FUNCTIONALITY_DISABLED,
  ),
  // Reveal SRP
  REVEAL_SRP_CTA: generateOpt(EVENT_NAME.REVEAL_SRP_CTA),
  REVEAL_SRP_SCREEN: generateOpt(EVENT_NAME.REVEAL_SRP_SCREEN),
  GO_BACK_SRP_SCREEN: generateOpt(EVENT_NAME.GO_BACK_SRP_SCREEN),
  CANCEL_REVEAL_SRP_CTA: generateOpt(EVENT_NAME.CANCEL_REVEAL_SRP_CTA),
  NEXT_REVEAL_SRP_CTA: generateOpt(EVENT_NAME.NEXT_REVEAL_SRP_CTA),
  VIEW_SRP: generateOpt(EVENT_NAME.VIEW_SRP),
  SRP_DISMISS_HOLD_TO_REVEAL_DIALOG: generateOpt(
    EVENT_NAME.SRP_DISMISS_HOLD_TO_REVEAL_DIALOG,
  ),
  VIEW_SRP_QR: generateOpt(EVENT_NAME.VIEW_SRP_QR),
  COPY_SRP: generateOpt(EVENT_NAME.COPY_SRP),
  SRP_DONE_CTA: generateOpt(EVENT_NAME.SRP_DONE_CTA),
  REVEAL_SRP_INITIATED: generateOpt(EVENT_NAME.REVEAL_SRP_INITIATED),
  REVEAL_SRP_CANCELLED: generateOpt(EVENT_NAME.REVEAL_SRP_CANCELLED),
  REVEAL_SRP_COMPLETED: generateOpt(EVENT_NAME.REVEAL_SRP_COMPLETED),
  REVEAL_PRIVATE_KEY_INITIATED: generateOpt(
    EVENT_NAME.REVEAL_PRIVATE_KEY_INITIATED,
  ),
  REVEAL_PRIVATE_KEY_CANCELLED: generateOpt(
    EVENT_NAME.REVEAL_PRIVATE_KEY_CANCELLED,
  ),
  REVEAL_PRIVATE_KEY_COMPLETED: generateOpt(
    EVENT_NAME.REVEAL_PRIVATE_KEY_COMPLETED,
  ),
  ANDROID_HARDWARE_KEYSTORE: generateOpt(EVENT_NAME.ANDROID_HARDWARE_KEYSTORE),
  CONNECT_HARDWARE_WALLET: generateOpt(EVENT_NAME.CONNECT_HARDWARE_WALLET),
  CONTINUE_QR_HARDWARE_WALLET: generateOpt(
    EVENT_NAME.CONTINUE_QR_HARDWARE_WALLET,
  ),
  CONNECT_HARDWARE_WALLET_SUCCESS: generateOpt(
    EVENT_NAME.CONNECT_HARDWARE_WALLET_SUCCESS,
  ),
  QR_HARDWARE_TRANSACTION_CANCELED: generateOpt(
    EVENT_NAME.QR_HARDWARE_TRANSACTION_CANCELED,
  ),
  HARDWARE_WALLET_ERROR: generateOpt(EVENT_NAME.HARDWARE_WALLET_ERROR),
  TOKEN_DETECTED: generateOpt(EVENT_NAME.TOKEN_DETECTED),
  TOKEN_IMPORT_CLICKED: generateOpt(EVENT_NAME.TOKEN_IMPORT_CLICKED),
  TOKEN_IMPORT_CANCELED: generateOpt(EVENT_NAME.TOKEN_IMPORT_CANCELED),
  TOKENS_HIDDEN: generateOpt(EVENT_NAME.TOKENS_HIDDEN),

  // ONRAMP
  BUY_BUTTON_CLICKED: generateOpt(EVENT_NAME.BUY_BUTTON_CLICKED),
  RAMP_REGION_SELECTED: generateOpt(EVENT_NAME.RAMP_REGION_SELECTED),
  ONRAMP_GET_STARTED_CLICKED: generateOpt(
    EVENT_NAME.ONRAMP_GET_STARTED_CLICKED,
  ),
  ONRAMP_PAYMENT_METHOD_SELECTED: generateOpt(
    EVENT_NAME.ONRAMP_PAYMENT_METHOD_SELECTED,
  ),
  ONRAMP_CONTINUE_TO_AMOUNT_CLICKED: generateOpt(
    EVENT_NAME.ONRAMP_CONTINUE_TO_AMOUNT_CLICKED,
  ),
  ONRAMP_QUOTES_REQUESTED: generateOpt(EVENT_NAME.ONRAMP_QUOTES_REQUESTED),
  ONRAMP_CANCELED: generateOpt(EVENT_NAME.ONRAMP_CANCELED),
  ONRAMP_QUOTES_RECEIVED: generateOpt(EVENT_NAME.ONRAMP_QUOTES_RECEIVED),
  ONRAMP_QUOTES_EXPANDED: generateOpt(EVENT_NAME.ONRAMP_QUOTES_EXPANDED),
  ONRAMP_PROVIDER_SELECTED: generateOpt(EVENT_NAME.ONRAMP_PROVIDER_SELECTED),
  ONRAMP_PROVIDER_DETAILS_VIEWED: generateOpt(
    EVENT_NAME.ONRAMP_PROVIDER_DETAILS_VIEWED,
  ),
  ONRAMP_DIRECT_PROVIDER_CLICKED: generateOpt(
    EVENT_NAME.ONRAMP_DIRECT_PROVIDER_CLICKED,
  ),
  ONRAMP_PURCHASE_SUBMITTED: generateOpt(EVENT_NAME.ONRAMP_PURCHASE_SUBMITTED),
  ONRAMP_PURCHASE_COMPLETED: generateOpt(EVENT_NAME.ONRAMP_PURCHASE_COMPLETED),
  ONRAMP_PURCHASE_FAILED: generateOpt(EVENT_NAME.ONRAMP_PURCHASE_FAILED),
  ONRAMP_PURCHASE_CANCELLED: generateOpt(EVENT_NAME.ONRAMP_PURCHASE_CANCELLED),
  ONRAMP_PURCHASE_DETAILS_VIEWED: generateOpt(
    EVENT_NAME.ONRAMP_PURCHASE_DETAILS_VIEWED,
  ),
  ONRAMP_EXTERNAL_LINK_CLICKED: generateOpt(
    EVENT_NAME.ONRAMP_EXTERNAL_LINK_CLICKED,
  ),
  ONRAMP_QUOTE_ERROR: generateOpt(EVENT_NAME.ONRAMP_QUOTE_ERROR),
  ONRAMP_ERROR: generateOpt(EVENT_NAME.ONRAMP_ERROR),
  ONRAMP_SETTINGS_CLICKED: generateOpt(EVENT_NAME.ONRAMP_SETTINGS_CLICKED),
  RAMP_REGION_RESET: generateOpt(EVENT_NAME.RAMP_REGION_RESET),

  // OFFRAMP
  SELL_BUTTON_CLICKED: generateOpt(EVENT_NAME.SELL_BUTTON_CLICKED),
  OFFRAMP_GET_STARTED_CLICKED: generateOpt(
    EVENT_NAME.OFFRAMP_GET_STARTED_CLICKED,
  ),
  OFFRAMP_PAYMENT_METHOD_SELECTED: generateOpt(
    EVENT_NAME.OFFRAMP_PAYMENT_METHOD_SELECTED,
  ),
  OFFRAMP_CONTINUE_TO_AMOUNT_CLICKED: generateOpt(
    EVENT_NAME.OFFRAMP_CONTINUE_TO_AMOUNT_CLICKED,
  ),
  OFFRAMP_QUOTES_REQUESTED: generateOpt(EVENT_NAME.OFFRAMP_QUOTES_REQUESTED),
  OFFRAMP_CANCELED: generateOpt(EVENT_NAME.OFFRAMP_CANCELED),
  OFFRAMP_QUOTES_RECEIVED: generateOpt(EVENT_NAME.OFFRAMP_QUOTES_RECEIVED),
  OFFRAMP_QUOTES_EXPANDED: generateOpt(EVENT_NAME.OFFRAMP_QUOTES_EXPANDED),
  OFFRAMP_PROVIDER_SELECTED: generateOpt(EVENT_NAME.OFFRAMP_PROVIDER_SELECTED),
  OFFRAMP_PROVIDER_DETAILS_VIEWED: generateOpt(
    EVENT_NAME.OFFRAMP_PROVIDER_DETAILS_VIEWED,
  ),
  OFFRAMP_DIRECT_PROVIDER_CLICKED: generateOpt(
    EVENT_NAME.OFFRAMP_DIRECT_PROVIDER_CLICKED,
  ),
  OFFRAMP_PURCHASE_SUBMITTED: generateOpt(
    EVENT_NAME.OFFRAMP_PURCHASE_SUBMITTED,
  ),
  OFFRAMP_PURCHASE_COMPLETED: generateOpt(
    EVENT_NAME.OFFRAMP_PURCHASE_COMPLETED,
  ),
  OFFRAMP_PURCHASE_FAILED: generateOpt(EVENT_NAME.OFFRAMP_PURCHASE_FAILED),
  OFFRAMP_PURCHASE_CANCELLED: generateOpt(
    EVENT_NAME.OFFRAMP_PURCHASE_CANCELLED,
  ),
  OFFRAMP_PURCHASE_DETAILS_VIEWED: generateOpt(
    EVENT_NAME.OFFRAMP_PURCHASE_DETAILS_VIEWED,
  ),
  OFFRAMP_QUOTE_ERROR: generateOpt(EVENT_NAME.OFFRAMP_QUOTE_ERROR),
  OFFRAMP_ERROR: generateOpt(EVENT_NAME.OFFRAMP_ERROR),
  OFFRAMP_SEND_CRYPTO_PROMPT_VIEWED: generateOpt(
    EVENT_NAME.OFFRAMP_SEND_CRYPTO_PROMPT_VIEWED,
  ),
  OFFRAMP_SEND_TRANSACTION_INVOKED: generateOpt(
    EVENT_NAME.OFFRAMP_SEND_TRANSACTION_INVOKED,
  ),
  OFFRAMP_SEND_TRANSACTION_CONFIRMED: generateOpt(
    EVENT_NAME.OFFRAMP_SEND_TRANSACTION_CONFIRMED,
  ),
  OFFRAMP_SEND_TRANSACTION_REJECTED: generateOpt(
    EVENT_NAME.OFFRAMP_SEND_TRANSACTION_REJECTED,
  ),

  // Deposit
  RAMP_PAYMENT_METHOD_CLICKED: generateOpt(
    EVENT_NAME.RAMP_PAYMENT_METHOD_CLICKED,
  ),
  RAMPS_BUTTON_CLICKED: generateOpt(EVENT_NAME.RAMPS_BUTTON_CLICKED),
  RAMPS_DEPOSIT_CASH_BUTTON_CLICKED: generateOpt(
    EVENT_NAME.RAMPS_DEPOSIT_CASH_BUTTON_CLICKED,
  ),
  RAMPS_PAYMENT_METHOD_SELECTED: generateOpt(
    EVENT_NAME.RAMPS_PAYMENT_METHOD_SELECTED,
  ),
  RAMPS_TOKEN_SELECTOR_CLICKED: generateOpt(
    EVENT_NAME.RAMPS_TOKEN_SELECTOR_CLICKED,
  ),
  RAMPS_TOKEN_SELECTED: generateOpt(EVENT_NAME.RAMPS_TOKEN_SELECTED),
  RAMPS_REGION_SELECTED: generateOpt(EVENT_NAME.RAMPS_REGION_SELECTED),
  RAMPS_ORDER_PROPOSED: generateOpt(EVENT_NAME.RAMPS_ORDER_PROPOSED),
  RAMPS_ORDER_SELECTED: generateOpt(EVENT_NAME.RAMPS_ORDER_SELECTED),
  RAMPS_ORDER_FAILED: generateOpt(EVENT_NAME.RAMPS_ORDER_FAILED),
  RAMPS_EMAIL_SUBMITTED: generateOpt(EVENT_NAME.RAMPS_EMAIL_SUBMITTED),
  RAMPS_OTP_CONFIRMED: generateOpt(EVENT_NAME.RAMPS_OTP_CONFIRMED),
  RAMPS_OTP_FAILED: generateOpt(EVENT_NAME.RAMPS_OTP_FAILED),
  RAMPS_OTP_RESENT: generateOpt(EVENT_NAME.RAMPS_OTP_RESENT),
  RAMPS_KYC_STARTED: generateOpt(EVENT_NAME.RAMPS_KYC_STARTED),
  RAMPS_BASIC_INFO_ENTERED: generateOpt(EVENT_NAME.RAMPS_BASIC_INFO_ENTERED),
  RAMPS_ADDRESS_ENTERED: generateOpt(EVENT_NAME.RAMPS_ADDRESS_ENTERED),
  RAMPS_TRANSACTION_CONFIRMED: generateOpt(
    EVENT_NAME.RAMPS_TRANSACTION_CONFIRMED,
  ),
  RAMPS_TRANSACTION_COMPLETED: generateOpt(
    EVENT_NAME.RAMPS_TRANSACTION_COMPLETED,
  ),
  RAMPS_TRANSACTION_FAILED: generateOpt(EVENT_NAME.RAMPS_TRANSACTION_FAILED),
  RAMPS_KYC_APPLICATION_FAILED: generateOpt(
    EVENT_NAME.RAMPS_KYC_APPLICATION_FAILED,
  ),
  RAMPS_KYC_APPLICATION_APPROVED: generateOpt(
    EVENT_NAME.RAMPS_KYC_APPLICATION_APPROVED,
  ),
  RAMPS_PAYMENT_METHOD_ADDED: generateOpt(
    EVENT_NAME.RAMPS_PAYMENT_METHOD_ADDED,
  ),
  RAMPS_USER_DETAILS_FETCHED: generateOpt(
    EVENT_NAME.RAMPS_USER_DETAILS_FETCHED,
  ),

  FORCE_UPGRADE_UPDATE_NEEDED_PROMPT_VIEWED: generateOpt(
    EVENT_NAME.FORCE_UPGRADE_UPDATE_NEEDED_PROMPT_VIEWED,
  ),
  FORCE_UPGRADE_UPDATE_TO_THE_LATEST_VERSION_CLICKED: generateOpt(
    EVENT_NAME.FORCE_UPGRADE_UPDATE_TO_THE_LATEST_VERSION_CLICKED,
  ),
  FORCE_UPGRADE_REMIND_ME_LATER_CLICKED: generateOpt(
    EVENT_NAME.FORCE_UPGRADE_REMIND_ME_LATER_CLICKED,
  ),
  AUTOMATIC_SECURITY_CHECKS_PROMPT_VIEWED: generateOpt(
    EVENT_NAME.AUTOMATIC_SECURITY_CHECKS_PROMPT_VIEWED,
  ),
  AUTOMATIC_SECURITY_CHECKS_ENABLED_FROM_PROMPT: generateOpt(
    EVENT_NAME.AUTOMATIC_SECURITY_CHECKS_ENABLED_FROM_PROMPT,
  ),
  AUTOMATIC_SECURITY_CHECKS_DISABLED_FROM_PROMPT: generateOpt(
    EVENT_NAME.AUTOMATIC_SECURITY_CHECKS_DISABLED_FROM_PROMPT,
  ),
  AUTOMATIC_SECURITY_CHECKS_ENABLED_FROM_SETTINGS: generateOpt(
    EVENT_NAME.AUTOMATIC_SECURITY_CHECKS_ENABLED_FROM_SETTINGS,
  ),
  AUTOMATIC_SECURITY_CHECKS_DISABLED_FROM_SETTINGS: generateOpt(
    EVENT_NAME.AUTOMATIC_SECURITY_CHECKS_DISABLED_FROM_SETTINGS,
  ),
  SCREENSHOT_WARNING: generateOpt(EVENT_NAME.SCREENSHOT_WARNING),
  SCREENSHOT_LEARN_MORE: generateOpt(EVENT_NAME.SCREENSHOT_LEARN_MORE),
  SCREENSHOT_OK: generateOpt(EVENT_NAME.SCREENSHOT_OK),
  SRP_SCREENSHOT_ATTEMPTED: generateOpt(EVENT_NAME.SRP_SCREENSHOT_ATTEMPTED),
  USER_TERMS_SHOWN: generateOpt(EVENT_NAME.USER_TERMS_SHOWN),
  USER_TERMS_ACCEPTED: generateOpt(EVENT_NAME.USER_TERMS_ACCEPTED),
  SRP_REVEAL_QUIZ_PROMPT_SEEN: generateOpt(
    EVENT_NAME.SRP_REVEAL_QUIZ_PROMPT_SEEN,
  ),
  SRP_REVEAL_START_CTA_SELECTED: generateOpt(
    EVENT_NAME.SRP_REVEAL_START_CTA_SELECTED,
  ),
  SRP_REVEAL_FIRST_QUESTION_SEEN: generateOpt(
    EVENT_NAME.SRP_REVEAL_FIRST_QUESTION_SEEN,
  ),
  SRP_REVEAL_FIRST_QUESTION_WRONG_ANSWER: generateOpt(
    EVENT_NAME.SRP_REVEAL_FIRST_QUESTION_WRONG_ANSWER,
  ),
  SRP_REVEAL_FIRST_QUESTION_RIGHT_ASNWER: generateOpt(
    EVENT_NAME.SRP_REVEAL_FIRST_QUESTION_RIGHT_ASNWER,
  ),
  SRP_REVEAL_SECOND_QUESTION_SEEN: generateOpt(
    EVENT_NAME.SRP_REVEAL_SECOND_QUESTION_SEEN,
  ),
  SRP_REVEAL_SECOND_QUESTION_WRONG_ANSWER: generateOpt(
    EVENT_NAME.SRP_REVEAL_SECOND_QUESTION_WRONG_ANSWER,
  ),
  SRP_REVEAL_SECOND_QUESTION_RIGHT_ASNWER: generateOpt(
    EVENT_NAME.SRP_REVEAL_SECOND_QUESTION_RIGHT_ASNWER,
  ),
  OPEN_DAPP_PERMISSIONS: generateOpt(EVENT_NAME.OPEN_DAPP_PERMISSIONS),
  REVOKE_ACCOUNT_DAPP_PERMISSIONS: generateOpt(
    EVENT_NAME.CHANGE_DAPP_PERMISSIONS,
    ACTIONS.PERMISSION_REVOKE_ACCOUNT,
  ),
  ADD_ACCOUNT_DAPP_PERMISSIONS: generateOpt(
    EVENT_NAME.CHANGE_DAPP_PERMISSIONS,
    ACTIONS.PERMISSION_NEW_ACCOUNT,
  ),
  BROWSER_SWITCH_TAB: generateOpt(EVENT_NAME.BROWSER_SWITCH_TAB),

  // Vault corruption
  VAULT_CORRUPTION_DETECTED: generateOpt(EVENT_NAME.VAULT_CORRUPTION_DETECTED),
  VAULT_CORRUPTION_RESTORE_WALLET_SCREEN_VIEWED: generateOpt(
    EVENT_NAME.VAULT_CORRUPTION_RESTORE_WALLET_SCREEN_VIEWED,
  ),
  VAULT_CORRUPTION_RESTORE_WALLET_BUTTON_PRESSED: generateOpt(
    EVENT_NAME.VAULT_CORRUPTION_RESTORE_WALLET_BUTTON_PRESSED,
  ),
  VAULT_CORRUPTION_WALLET_SUCCESSFULLY_RESTORED_SCREEN_VIEWED: generateOpt(
    EVENT_NAME.VAULT_CORRUPTION_WALLET_SUCCESSFULLY_RESTORED_SCREEN_VIEWED,
  ),
  VAULT_CORRUPTION_WALLET_SUCCESSFULLY_RESTORED_CONTINUE_BUTTON_PRESSED:
    generateOpt(
      EVENT_NAME.VAULT_CORRUPTION_WALLET_SUCCESSFULLY_RESTORED_CONTINUE_BUTTON_PRESSED,
    ),
  VAULT_CORRUPTION_WALLET_RESET_NEEDED_SCREEN_VIEWED: generateOpt(
    EVENT_NAME.VAULT_CORRUPTION_WALLET_RESET_NEEDED_SCREEN_VIEWED,
  ),
  VAULT_CORRUPTION_WALLET_RESET_NEEDED_TRY_AGAIN_BUTTON_PRESSED: generateOpt(
    EVENT_NAME.VAULT_CORRUPTION_WALLET_RESET_NEEDED_TRY_AGAIN_BUTTON_PRESSED,
  ),
  VAULT_CORRUPTION_WALLET_RESET_NEEDED_CREATE_NEW_WALLET_BUTTON_PRESSED:
    generateOpt(
      EVENT_NAME.VAULT_CORRUPTION_WALLET_RESET_NEEDED_CREATE_NEW_WALLET_BUTTON_PRESSED,
    ),

  // Login screen
  LOGIN_SCREEN_VIEWED: generateOpt(EVENT_NAME.LOGIN_SCREEN_VIEWED),

  // Delete Wallet Modal
  RESET_WALLET_CONFIRMED: generateOpt(EVENT_NAME.RESET_WALLET_CONFIRMED),

  // Tab Bar Actions
  ACTIONS_BUTTON_CLICKED: generateOpt(EVENT_NAME.ACTIONS_BUTTON_CLICKED),
  RECEIVE_BUTTON_CLICKED: generateOpt(EVENT_NAME.RECEIVE_BUTTON_CLICKED),
  SWAP_BUTTON_CLICKED: generateOpt(EVENT_NAME.SWAP_BUTTON_CLICKED),
  SEND_BUTTON_CLICKED: generateOpt(EVENT_NAME.SEND_BUTTON_CLICKED),
  ACTION_BUTTON_CLICKED: generateOpt(EVENT_NAME.ACTION_BUTTON_CLICKED),
  EARN_BUTTON_CLICKED: generateOpt(EVENT_NAME.EARN_BUTTON_CLICKED),
  NETWORK_SELECTOR_PRESSED: generateOpt(EVENT_NAME.NETWORK_SELECTOR),

  // Edit account name
  ACCOUNT_RENAMED: generateOpt(EVENT_NAME.ACCOUNT_RENAMED),

  // Settings
  SETTINGS_UPDATED: generateOpt(EVENT_NAME.SETTINGS_UPDATED),

  // Experimental Settings
  SETTINGS_SECURITY_ALERTS_ENABLED: generateOpt(EVENT_NAME.SETTINGS_UPDATED),

  // Ledger
  CONNECT_LEDGER: generateOpt(EVENT_NAME.CONNECT_LEDGER),
  CONTINUE_LEDGER_HARDWARE_WALLET: generateOpt(
    EVENT_NAME.CONTINUE_LEDGER_HARDWARE_WALLET,
  ),
  CONNECT_LEDGER_SUCCESS: generateOpt(EVENT_NAME.CONNECT_LEDGER_SUCCESS),
  LEDGER_HARDWARE_TRANSACTION_CANCELLED: generateOpt(
    EVENT_NAME.LEDGER_HARDWARE_TRANSACTION_CANCELLED,
  ),
  LEDGER_HARDWARE_WALLET_ERROR: generateOpt(
    EVENT_NAME.LEDGER_HARDWARE_WALLET_ERROR,
  ),
  HARDWARE_WALLET_FORGOTTEN: generateOpt(EVENT_NAME.HARDWARE_WALLET_FORGOTTEN),

  // Remove an account
  ACCOUNT_REMOVED: generateOpt(EVENT_NAME.ACCOUNT_REMOVED),
  ACCOUNT_REMOVE_FAILED: generateOpt(EVENT_NAME.ACCOUNT_REMOVE_FAILED),
  ACCOUNT_ADDED: generateOpt(EVENT_NAME.ACCOUNT_ADDED),

  // Smart transactions
  SMART_TRANSACTION_OPT_IN: generateOpt(EVENT_NAME.SMART_TRANSACTION_OPT_IN),

  // User opt in for smart account upgrade
  SMART_ACCOUNT_OPT_IN: generateOpt(EVENT_NAME.SMART_ACCOUNT_OPT_IN),

  // Dismiss smart account upgrade suggestion
  DISMISS_SMART_ACCOUNT_SUGGESTION_ENABLED: generateOpt(
    EVENT_NAME.DISMISS_SMART_ACCOUNT_SUGGESTION_ENABLED,
  ),

  // Notifications
  ALL_NOTIFICATIONS: generateOpt(
    EVENT_NAME.ALL_NOTIFICATIONS,
    ACTIONS.SELECTS_ALL_NOTIFICATIONS,
  ),
  WALLET_NOTIFICATIONS: generateOpt(
    EVENT_NAME.WALLET_NOTIFICATIONS,
    ACTIONS.SELECTS_WALLET_NOTIFICATIONS,
  ),
  ANNOUCEMENTS_NOTIFICATIONS: generateOpt(
    EVENT_NAME.ANNOUCEMENTS_NOTIFICATIONS,
    ACTIONS.SELECTS_ANNOUCEMENTS_NOTIFICATIONS,
  ),
  NOTIFICATIONS_ACTIVATED: generateOpt(EVENT_NAME.NOTIFICATIONS_ACTIVATED),
  NOTIFICATIONS_MENU_OPENED: generateOpt(EVENT_NAME.NOTIFICATIONS_MENU_OPENED),
  NOTIFICATION_CLICKED: generateOpt(EVENT_NAME.NOTIFICATION_CLICKED),
  NOTIFICATIONS_MARKED_ALL_AS_READ: generateOpt(
    EVENT_NAME.NOTIFICATIONS_MARKED_ALL_AS_READ,
  ),
  NOTIFICATION_DETAIL_CLICKED: generateOpt(
    EVENT_NAME.NOTIFICATION_DETAIL_CLICKED,
  ),

  // Push Notifications Flow
  PUSH_NOTIFICATION_RECEIVED: generateOpt(
    EVENT_NAME.PUSH_NOTIFICATION_RECEIVED,
  ),
  PUSH_NOTIFICATION_CLICKED: generateOpt(EVENT_NAME.PUSH_NOTIFICATION_CLICKED),

  // Simulations
  INCOMPLETE_ASSET_DISPLAYED: generateOpt(
    EVENT_NAME.INCOMPLETE_ASSET_DISPLAYED,
  ),
  // Nft auto detection modal
  MULTI_RPC_MIGRATION_MODAL_ACCEPTED: generateOpt(
    EVENT_NAME.MULTI_RPC_MIGRATION_MODAL_ACCEPTED,
  ),
  LOGIN_DOWNLOAD_LOGS: generateOpt(EVENT_NAME.LOGIN_DOWNLOAD_LOGS),
  // Backup and sync
  ACCOUNTS_SYNC_ADDED: generateOpt(EVENT_NAME.ACCOUNTS_SYNC_ADDED),
  ACCOUNTS_SYNC_NAME_UPDATED: generateOpt(
    EVENT_NAME.ACCOUNTS_SYNC_NAME_UPDATED,
  ),
  ACCOUNTS_SYNC_ERRONEOUS_SITUATION: generateOpt(
    EVENT_NAME.ACCOUNTS_SYNC_ERRONEOUS_SITUATION,
  ),
  PROFILE_ACTIVITY_UPDATED: generateOpt(EVENT_NAME.PROFILE_ACTIVITY_UPDATED),
  // Connection
  CONNECTION_DROPPED: generateOpt(EVENT_NAME.CONNECTION_DROPPED),
  CONNECTION_RESTORED: generateOpt(EVENT_NAME.CONNECTION_RESTORED),
  // Earn
  EARN_EMPTY_STATE_CTA_CLICKED: generateOpt(
    EVENT_NAME.EARN_EMPTY_STATE_CTA_CLICKED,
  ),
  EARN_LEARN_MORE_CLICKED: generateOpt(EVENT_NAME.EARN_LEARN_MORE_CLICKED),
  EARN_DEPOSIT_REVIEW_CANCEL_CLICKED: generateOpt(
    EVENT_NAME.EARN_DEPOSIT_REVIEW_CANCEL_CLICKED,
  ),
  EARN_DEPOSIT_REVIEW_CONFIRM_CLICKED: generateOpt(
    EVENT_NAME.EARN_DEPOSIT_REVIEW_CONFIRM_CLICKED,
  ),
  EARN_ACTION_BUTTON_CLICKED: generateOpt(
    EVENT_NAME.EARN_ACTION_BUTTON_CLICKED,
  ),
  EARN_INPUT_OPENED: generateOpt(EVENT_NAME.EARN_INPUT_OPENED),
  EARN_INPUT_BACK_BUTTON_CLICKED: generateOpt(
    EVENT_NAME.EARN_INPUT_BACK_BUTTON_CLICKED,
  ),
  EARN_INPUT_VALUE_CHANGED: generateOpt(EVENT_NAME.EARN_INPUT_VALUE_CHANGED),
  EARN_REVIEW_BUTTON_CLICKED: generateOpt(
    EVENT_NAME.EARN_REVIEW_BUTTON_CLICKED,
  ),
  EARN_CONFIRMATION_PAGE_VIEWED: generateOpt(
    EVENT_NAME.EARN_CONFIRMATION_PAGE_VIEWED,
  ),
  EARN_ACTION_SUBMITTED: generateOpt(EVENT_NAME.EARN_ACTION_SUBMITTED),
  EARN_TRANSACTION_INITIATED: generateOpt(
    EVENT_NAME.EARN_TRANSACTION_INITIATED,
  ),
  EARN_TRANSACTION_APPROVED: generateOpt(EVENT_NAME.EARN_TRANSACTION_APPROVED),
  EARN_TRANSACTION_REJECTED: generateOpt(EVENT_NAME.EARN_TRANSACTION_REJECTED),
  EARN_TRANSACTION_SUBMITTED: generateOpt(
    EVENT_NAME.EARN_TRANSACTION_SUBMITTED,
  ),
  EARN_TRANSACTION_CONFIRMED: generateOpt(
    EVENT_NAME.EARN_TRANSACTION_CONFIRMED,
  ),
  EARN_TRANSACTION_FAILED: generateOpt(EVENT_NAME.EARN_TRANSACTION_FAILED),
  EARN_TRANSACTION_DROPPED: generateOpt(EVENT_NAME.EARN_TRANSACTION_DROPPED),
  EARN_WITHDRAWAL_REVIEW_CANCEL_CLICKED: generateOpt(
    EVENT_NAME.EARN_WITHDRAWAL_REVIEW_CANCEL_CLICKED,
  ),
  EARN_LENDING_FAQ_LINK_OPENED: generateOpt(
    EVENT_NAME.EARN_LENDING_FAQ_LINK_OPENED,
  ),
  EARN_INPUT_INSUFFICIENT_BALANCE: generateOpt(
    EVENT_NAME.EARN_INPUT_INSUFFICIENT_BALANCE,
  ),
  EARN_INPUT_CURRENCY_SWITCH_CLICKED: generateOpt(
    EVENT_NAME.EARN_INPUT_CURRENCY_SWITCH_CLICKED,
  ),
  EARN_LENDING_DEPOSIT_MORE_BUTTON_CLICKED: generateOpt(
    EVENT_NAME.EARN_LENDING_DEPOSIT_MORE_BUTTON_CLICKED,
  ),
  EARN_LENDING_WITHDRAW_BUTTON_CLICKED: generateOpt(
    EVENT_NAME.EARN_LENDING_WITHDRAW_BUTTON_CLICKED,
  ),
  EARN_LENDING_WITHDRAW_CONFIRMATION_BACK_CLICKED: generateOpt(
    EVENT_NAME.EARN_LENDING_WITHDRAW_CONFIRMATION_BACK_CLICKED,
  ),
  // Stake
  REVIEW_STAKE_BUTTON_CLICKED: generateOpt(
    EVENT_NAME.REVIEW_STAKE_BUTTON_CLICKED,
  ),
  REVIEW_UNSTAKE_BUTTON_CLICKED: generateOpt(
    EVENT_NAME.REVIEW_UNSTAKE_BUTTON_CLICKED,
  ),
  STAKE_INPUT_QUICK_AMOUNT_CLICKED: generateOpt(
    EVENT_NAME.STAKE_INPUT_QUICK_AMOUNT_CLICKED,
  ),
  UNSTAKE_INPUT_QUICK_AMOUNT_CLICKED: generateOpt(
    EVENT_NAME.UNSTAKE_INPUT_QUICK_AMOUNT_CLICKED,
  ),
  STAKE_WITHDRAW_BUTTON_CLICKED: generateOpt(
    EVENT_NAME.STAKE_WITHDRAW_BUTTON_CLICKED,
  ),
  STAKE_CLAIM_BUTTON_CLICKED: generateOpt(
    EVENT_NAME.STAKE_CLAIM_BUTTON_CLICKED,
  ),
  STAKE_LEARN_MORE_CLICKED: generateOpt(EVENT_NAME.STAKE_LEARN_MORE_CLICKED),
  STAKE_CANCEL_CLICKED: generateOpt(EVENT_NAME.STAKE_CANCEL_CLICKED),
  STAKE_CONFIRMATION_BACK_CLICKED: generateOpt(
    EVENT_NAME.STAKE_CONFIRMATION_BACK_CLICKED,
  ),
  STAKE_TRANSACTION_INITIATED: generateOpt(
    EVENT_NAME.STAKE_TRANSACTION_INITIATED,
  ),
  STAKE_TRANSACTION_APPROVED: generateOpt(
    EVENT_NAME.STAKE_TRANSACTION_APPROVED,
  ),
  STAKE_TRANSACTION_REJECTED: generateOpt(
    EVENT_NAME.STAKE_TRANSACTION_REJECTED,
  ),
  STAKE_TRANSACTION_FAILED: generateOpt(EVENT_NAME.STAKE_TRANSACTION_FAILED),
  STAKE_TRANSACTION_CONFIRMED: generateOpt(
    EVENT_NAME.STAKE_TRANSACTION_CONFIRMED,
  ),
  STAKE_TRANSACTION_SUBMITTED: generateOpt(
    EVENT_NAME.STAKE_TRANSACTION_SUBMITTED,
  ),
  STAKE_GAS_COST_IMPACT_WARNING_TRIGGERED: generateOpt(
    EVENT_NAME.STAKE_GAS_COST_IMPACT_WARNING_TRIGGERED,
  ),
  STAKE_GAS_COST_IMPACT_CANCEL_CLICKED: generateOpt(
    EVENT_NAME.STAKE_GAS_COST_IMPACT_CANCEL_CLICKED,
  ),
  STAKE_GAS_COST_IMPACT_PROCEEDED_CLICKED: generateOpt(
    EVENT_NAME.STAKE_GAS_COST_IMPACT_PROCEEDED_CLICKED,
  ),
  UNSTAKE_INPUT_CURRENCY_SWITCH_CLICKED: generateOpt(
    EVENT_NAME.UNSTAKE_INPUT_CURRENCY_SWITCH_CLICKED,
  ),
  UNSTAKE_CANCEL_CLICKED: generateOpt(EVENT_NAME.UNSTAKE_CANCEL_CLICKED),
  UNSTAKE_CONFIRMATION_BACK_CLICKED: generateOpt(
    EVENT_NAME.UNSTAKE_CONFIRMATION_BACK_CLICKED,
  ),
  UNSTAKE_TRANSACTION_INITIATED: generateOpt(
    EVENT_NAME.UNSTAKE_TRANSACTION_INITIATED,
  ),
  UNSTAKE_TRANSACTION_APPROVED: generateOpt(
    EVENT_NAME.UNSTAKE_TRANSACTION_APPROVED,
  ),
  UNSTAKE_TRANSACTION_REJECTED: generateOpt(
    EVENT_NAME.UNSTAKE_TRANSACTION_REJECTED,
  ),
  UNSTAKE_TRANSACTION_FAILED: generateOpt(
    EVENT_NAME.UNSTAKE_TRANSACTION_FAILED,
  ),
  UNSTAKE_TRANSACTION_CONFIRMED: generateOpt(
    EVENT_NAME.UNSTAKE_TRANSACTION_CONFIRMED,
  ),
  UNSTAKE_TRANSACTION_SUBMITTED: generateOpt(
    EVENT_NAME.UNSTAKE_TRANSACTION_SUBMITTED,
  ),
  VISITED_ETH_OVERVIEW_WITH_STAKED_POSITIONS: generateOpt(
    EVENT_NAME.VISITED_ETH_OVERVIEW_WITH_STAKED_POSITIONS,
  ),
  EARN_TOKEN_LIST_ITEM_CLICKED: generateOpt(
    EVENT_NAME.EARN_TOKEN_LIST_ITEM_CLICKED,
  ),
  TOKEN_DETAILS_OPENED: generateOpt(EVENT_NAME.TOKEN_LIST_ITEM_CLICKED),

  // Bridge
  SWAP_PAGE_VIEWED: generateOpt(EVENT_NAME.SWAP_PAGE_VIEWED), // Temporary event until unified swap/bridge is done

  // RPC Failover
  RPC_SERVICE_UNAVAILABLE: generateOpt(EVENT_NAME.RPC_SERVICE_UNAVAILABLE),
  RPC_SERVICE_DEGRADED: generateOpt(EVENT_NAME.RPC_SERVICE_DEGRADED),

  // NETWORK CONNECTION BANNER
  NETWORK_CONNECTION_BANNER_SHOWN: generateOpt(
    EVENT_NAME.NETWORK_CONNECTION_BANNER_SHOWN,
  ),
  NETWORK_CONNECTION_BANNER_UPDATE_RPC_CLICKED: generateOpt(
    EVENT_NAME.NETWORK_CONNECTION_BANNER_UPDATE_RPC_CLICKED,
  ),
  NetworkConnectionBannerRpcUpdated: generateOpt(
    EVENT_NAME.NetworkConnectionBannerRpcUpdated,
  ),

  // Multi SRP
  IMPORT_SECRET_RECOVERY_PHRASE_CLICKED: generateOpt(
    EVENT_NAME.IMPORT_SECRET_RECOVERY_PHRASE_CLICKED,
  ),
  IMPORT_SECRET_RECOVERY_PHRASE_COMPLETED: generateOpt(
    EVENT_NAME.IMPORT_SECRET_RECOVERY_PHRASE_COMPLETED,
  ),
  SECRET_RECOVERY_PHRASE_PICKER_CLICKED: generateOpt(
    EVENT_NAME.SECRET_RECOVERY_PHRASE_PICKER_CLICKED,
  ),

  // Deep Link Modal
  DEEP_LINK_PRIVATE_MODAL_VIEWED: generateOpt(
    EVENT_NAME.DEEP_LINK_PRIVATE_MODAL_VIEWED,
  ),
  DEEP_LINK_PUBLIC_MODAL_VIEWED: generateOpt(
    EVENT_NAME.DEEP_LINK_PUBLIC_MODAL_VIEWED,
  ),
  DEEP_LINK_INVALID_MODAL_VIEWED: generateOpt(
    EVENT_NAME.DEEP_LINK_INVALID_MODAL_VIEWED,
  ),
  DEEP_LINK_UNSUPPORTED_MODAL_VIEWED: generateOpt(
    EVENT_NAME.DEEP_LINK_UNSUPPORTED_MODAL_VIEWED,
  ),
  DEEP_LINK_PRIVATE_MODAL_DISMISSED: generateOpt(
    EVENT_NAME.DEEP_LINK_PRIVATE_MODAL_DISMISSED,
  ),
  DEEP_LINK_PUBLIC_MODAL_DISMISSED: generateOpt(
    EVENT_NAME.DEEP_LINK_PUBLIC_MODAL_DISMISSED,
  ),
  DEEP_LINK_INVALID_MODAL_DISMISSED: generateOpt(
    EVENT_NAME.DEEP_LINK_INVALID_MODAL_DISMISSED,
  ),
  DEEP_LINK_UNSUPPORTED_MODAL_DISMISSED: generateOpt(
    EVENT_NAME.DEEP_LINK_UNSUPPORTED_MODAL_DISMISSED,
  ),
  DEEP_LINK_PRIVATE_MODAL_CONTINUE_CLICKED: generateOpt(
    EVENT_NAME.DEEP_LINK_PRIVATE_MODAL_CONTINUE_CLICKED,
  ),
  DEEP_LINK_PUBLIC_MODAL_CONTINUE_CLICKED: generateOpt(
    EVENT_NAME.DEEP_LINK_PUBLIC_MODAL_CONTINUE_CLICKED,
  ),
  DEEP_LINK_MODAL_PRIVATE_DONT_REMIND_ME_AGAIN_CHECKBOX_CHECKED: generateOpt(
    EVENT_NAME.DEEP_LINK_MODAL_PRIVATE_DONT_REMIND_ME_AGAIN_CHECKBOX_CHECKED,
  ),
  DEEP_LINK_MODAL_PRIVATE_DONT_REMIND_ME_AGAIN_CHECKBOX_UNCHECKED: generateOpt(
    EVENT_NAME.DEEP_LINK_MODAL_PRIVATE_DONT_REMIND_ME_AGAIN_CHECKBOX_UNCHECKED,
  ),
  // Perps Events - Consolidated
  PERPS_WITHDRAWAL_TRANSACTION: generateOpt(
    EVENT_NAME.PERPS_WITHDRAWAL_TRANSACTION,
  ),
  PERPS_TRADE_TRANSACTION: generateOpt(EVENT_NAME.PERPS_TRADE_TRANSACTION),
  PERPS_POSITION_CLOSE_TRANSACTION: generateOpt(
    EVENT_NAME.PERPS_POSITION_CLOSE_TRANSACTION,
  ),
  PERPS_ORDER_CANCEL_TRANSACTION: generateOpt(
    EVENT_NAME.PERPS_ORDER_CANCEL_TRANSACTION,
  ),
  PERPS_SCREEN_VIEWED: generateOpt(EVENT_NAME.PERPS_SCREEN_VIEWED),
  PERPS_UI_INTERACTION: generateOpt(EVENT_NAME.PERPS_UI_INTERACTION),
  PERPS_RISK_MANAGEMENT: generateOpt(EVENT_NAME.PERPS_RISK_MANAGEMENT),
  PERPS_ERROR: generateOpt(EVENT_NAME.PERPS_ERROR),

  // Asset Filter
  ASSET_FILTER_SELECTED: generateOpt(EVENT_NAME.ASSET_FILTER_SELECTED),
  ASSET_FILTER_CUSTOM_SELECTED: generateOpt(
    EVENT_NAME.ASSET_FILTER_CUSTOM_SELECTED,
  ),
  // Card
  CARD_BUTTON_VIEWED: generateOpt(EVENT_NAME.CARD_BUTTON_VIEWED),
  CARD_HOME_CLICKED: generateOpt(EVENT_NAME.CARD_HOME_CLICKED),
  CARD_HOME_VIEWED: generateOpt(EVENT_NAME.CARD_HOME_VIEWED),
  CARD_ADD_FUNDS_CLICKED: generateOpt(EVENT_NAME.CARD_ADD_FUNDS_CLICKED),
  CARD_ADD_FUNDS_SWAPS_CLICKED: generateOpt(
    EVENT_NAME.CARD_ADD_FUNDS_SWAPS_CLICKED,
  ),
  CARD_ADD_FUNDS_DEPOSIT_CLICKED: generateOpt(
    EVENT_NAME.CARD_ADD_FUNDS_DEPOSIT_CLICKED,
  ),
  CARD_ADVANCED_CARD_MANAGEMENT_CLICKED: generateOpt(
    EVENT_NAME.CARD_ADVANCED_CARD_MANAGEMENT_CLICKED,
  ),
  CARD_VIEWED: generateOpt(EVENT_NAME.CARD_VIEWED),
  CARD_BUTTON_CLICKED: generateOpt(EVENT_NAME.CARD_BUTTON_CLICKED),
  CARD_DELEGATION_PROCESS_STARTED: generateOpt(
    EVENT_NAME.CARD_DELEGATION_PROCESS_STARTED,
  ),
  CARD_DELEGATION_PROCESS_COMPLETED: generateOpt(
    EVENT_NAME.CARD_DELEGATION_PROCESS_COMPLETED,
  ),
  CARD_DELEGATION_PROCESS_FAILED: generateOpt(
    EVENT_NAME.CARD_DELEGATION_PROCESS_FAILED,
  ),
  CARD_DELEGATION_PROCESS_USER_CANCELED: generateOpt(
    EVENT_NAME.CARD_DELEGATION_PROCESS_USER_CANCELED,
  ),
  // Rewards
  REWARDS_ACCOUNT_LINKING_STARTED: generateOpt(
    EVENT_NAME.REWARDS_ACCOUNT_LINKING_STARTED,
  ),
  REWARDS_ACCOUNT_LINKING_COMPLETED: generateOpt(
    EVENT_NAME.REWARDS_ACCOUNT_LINKING_COMPLETED,
  ),
  REWARDS_ACCOUNT_LINKING_FAILED: generateOpt(
    EVENT_NAME.REWARDS_ACCOUNT_LINKING_FAILED,
  ),
  REWARDS_ACTIVE_BOOST_CLICKED: generateOpt(
    EVENT_NAME.REWARDS_ACTIVE_BOOST_CLICKED,
  ),
  REWARDS_DASHBOARD_TAB_VIEWED: generateOpt(
    EVENT_NAME.REWARDS_DASHBOARD_TAB_VIEWED,
  ),
  REWARDS_DASHBOARD_VIEWED: generateOpt(EVENT_NAME.REWARDS_DASHBOARD_VIEWED),
  REWARDS_ONBOARDING_STARTED: generateOpt(
    EVENT_NAME.REWARDS_ONBOARDING_STARTED,
  ),
  REWARDS_ONBOARDING_COMPLETED: generateOpt(
    EVENT_NAME.REWARDS_ONBOARDING_COMPLETED,
  ),
  REWARDS_OPT_IN_STARTED: generateOpt(EVENT_NAME.REWARDS_OPT_IN_STARTED),
  REWARDS_OPT_IN_COMPLETED: generateOpt(EVENT_NAME.REWARDS_OPT_IN_COMPLETED),
  REWARDS_OPT_IN_FAILED: generateOpt(EVENT_NAME.REWARDS_OPT_IN_FAILED),
  REWARDS_OPT_OUT_STARTED: generateOpt(EVENT_NAME.REWARDS_OPT_OUT_STARTED),
  REWARDS_OPT_OUT_COMPLETED: generateOpt(EVENT_NAME.REWARDS_OPT_OUT_COMPLETED),
  REWARDS_OPT_OUT_FAILED: generateOpt(EVENT_NAME.REWARDS_OPT_OUT_FAILED),
  REWARDS_PAGE_BUTTON_CLICKED: generateOpt(
    EVENT_NAME.REWARDS_PAGE_BUTTON_CLICKED,
  ),
  REWARDS_REFERRALS_VIEWED: generateOpt(EVENT_NAME.REWARDS_REFERRALS_VIEWED),
  REWARDS_REWARD_CLAIMED: generateOpt(EVENT_NAME.REWARDS_REWARD_CLAIMED),
  REWARDS_REWARD_VIEWED: generateOpt(EVENT_NAME.REWARDS_REWARD_VIEWED),
  REWARDS_SETTINGS_VIEWED: generateOpt(EVENT_NAME.REWARDS_SETTINGS_VIEWED),
  REWARDS_WAYS_TO_EARN_CTA_CLICKED: generateOpt(
    EVENT_NAME.REWARDS_WAYS_TO_EARN_CTA_CLICKED,
  ),
  // Predict
  PREDICT_TRADE_TRANSACTION: generateOpt(EVENT_NAME.PREDICT_TRADE_TRANSACTION),
  PREDICT_MARKET_DETAILS_OPENED: generateOpt(
    EVENT_NAME.PREDICT_MARKET_DETAILS_OPENED,
  ),
  PREDICT_POSITION_VIEWED: generateOpt(EVENT_NAME.PREDICT_POSITION_VIEWED),
  PREDICT_ACTIVITY_VIEWED: generateOpt(EVENT_NAME.PREDICT_ACTIVITY_VIEWED),
  PREDICT_GEO_BLOCKED_TRIGGERED: generateOpt(
    EVENT_NAME.PREDICT_GEO_BLOCKED_TRIGGERED,
  ),
  PREDICT_FEED_VIEWED: generateOpt(EVENT_NAME.PREDICT_FEED_VIEWED),

  // Share
  SHARE_ACTION: generateOpt(EVENT_NAME.SHARE_ACTION),

  // QR Scanner
  QR_SCANNER_OPENED: generateOpt(EVENT_NAME.QR_SCANNER_OPENED),
  QR_SCANNED: generateOpt(EVENT_NAME.QR_SCANNED),
};

/**
 * Legacy Analytics Tracking Events
 */

enum DESCRIPTION {
  // Navigation Drawer
  NAVIGATION_TAPS_ACCOUNT_NAME = 'Tapped Account Name / Profile',
  NAVIGATION_TAPS_SEND = "Taps on 'Send'",
  NAVIGATION_TAPS_RECEIVE = "Taps on 'Receive'",
  NAVIGATION_TAPS_BROWSER = 'Taps Browser',
  NAVIGATION_TAPS_TRANSACTION_HISTORY = 'Transaction History',
  NAVIGATION_TAPS_SHARE_PUBLIC_ADDRESS = 'Share my Public address',
  NAVIGATION_TAPS_VIEW_ETHERSCAN = 'View on Etherscan',
  NAVIGATION_TAPS_GET_HELP = 'Get Help',
  NAVIGATION_TAPS_SEND_FEEDBACK = 'Send Feedback',
  NAVIGATION_TAPS_SETTINGS = 'Settings',
  NAVIGATION_TAPS_REWARDS = 'Rewards',
  NAVIGATION_TAPS_TRENDING = 'Trending',
  NAVIGATION_TAPS_LOGOUT = 'Logout',
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
  TRANSACTIONS_CANCEL_TRANSACTION = 'Cancel',
  TRANSACTIONS_COMPLETED_TRANSACTION = 'Transaction Completed',
  TRANSACTIONS_CONFIRM_SIGNATURE = 'Confirm',
  TRANSACTIONS_CANCEL_SIGNATURE = 'Cancel',
  // Accounts
  ACCOUNTS_ADDED_NEW_ACCOUNT = 'Added New Account',
  ACCOUNTS_IMPORTED_NEW_ACCOUNT = 'Imported New Account',
  // Settings
  SETTINGS_GENERAL = 'General',
  SETTINGS_ADVANCED = 'Advanced',
  SETTINGS_NOTIFICATIONS = 'Notifications',
  SETTINGS_BACKUP_AND_SYNC = 'Backup & Sync',
  SETTINGS_SECURITY_AND_PRIVACY = 'Security & Privacy',
  SETTINGS_ABOUT = 'About MetaMask',
  SETTINGS_EXPERIMENTAL = 'Experimental',
  // Receive Options
  RECEIVE_OPTIONS_SHARE_ADDRESS = 'Share address',
  RECEIVE_OPTIONS_QR_CODE = 'QR Code',
  RECEIVE_OPTIONS_PAYMENT_REQUEST = 'Payment Request',
  // Re-designed send
  SEND_STARTED = 'Send flow started',
  SEND_ASSET_SELECTED = 'Send asset selected',
  SEND_AMOUNT_SELECTED = 'Send amount selected',
  SEND_RECIPIENT_SELECTED = 'Send recipient selected',
  SEND_EXIT = 'Send flow exitted',
  // Send flow
  SEND_FLOW_ADDS_RECIPIENT = `Adds recipient address 'Send to'`,
  SEND_FLOW_ADDS_AMOUNT = `Adds Amount`,
  SEND_FLOW_ADJUSTS_TRANSACTION_FEE = `Adjusts transaction fee`,
  SEND_FLOW_SELECT_DUPLICATE_ADDRESS = `Select duplicate address`,
  SEND_FLOW_CANCEL = `Cancel`,
  // Dapp Interactions
  DAPP_APPROVE_SCREEN_VIEW_DETAILS = 'View tx details',
  SWAPS = 'Swaps',
  BRIDGE = 'Bridge',
  STAKE = 'Stake',
  NOTIFICATIONS = 'Notifications',
}

const legacyMetaMetricsEvents = {
  // Navigation Drawer
  NAVIGATION_TAPS_ACCOUNT_NAME: generateOpt(
    EVENT_NAME.NAVIGATION_DRAWER,
    ACTIONS.NAVIGATION_DRAWER,
    DESCRIPTION.NAVIGATION_TAPS_ACCOUNT_NAME,
  ),
  NAVIGATION_TAPS_SEND: generateOpt(
    EVENT_NAME.NAVIGATION_DRAWER,
    ACTIONS.NAVIGATION_DRAWER,
    DESCRIPTION.NAVIGATION_TAPS_SEND,
  ),
  NAVIGATION_TAPS_RECEIVE: generateOpt(
    EVENT_NAME.NAVIGATION_DRAWER,
    ACTIONS.NAVIGATION_DRAWER,
    DESCRIPTION.NAVIGATION_TAPS_RECEIVE,
  ),
  NAVIGATION_TAPS_BROWSER: generateOpt(
    EVENT_NAME.NAVIGATION_DRAWER,
    ACTIONS.NAVIGATION_DRAWER,
    DESCRIPTION.NAVIGATION_TAPS_BROWSER,
  ),
  NAVIGATION_TAPS_TRANSACTION_HISTORY: generateOpt(
    EVENT_NAME.NAVIGATION_DRAWER,
    ACTIONS.NAVIGATION_DRAWER,
    DESCRIPTION.NAVIGATION_TAPS_TRANSACTION_HISTORY,
  ),
  NAVIGATION_TAPS_SHARE_PUBLIC_ADDRESS: generateOpt(
    EVENT_NAME.NAVIGATION_DRAWER,
    ACTIONS.NAVIGATION_DRAWER,
    DESCRIPTION.NAVIGATION_TAPS_SHARE_PUBLIC_ADDRESS,
  ),
  NAVIGATION_TAPS_VIEW_ETHERSCAN: generateOpt(
    EVENT_NAME.NAVIGATION_DRAWER,
    ACTIONS.NAVIGATION_DRAWER,
    DESCRIPTION.NAVIGATION_TAPS_VIEW_ETHERSCAN,
  ),
  NAVIGATION_TAPS_GET_HELP: generateOpt(
    EVENT_NAME.NAVIGATION_DRAWER,
    ACTIONS.NAVIGATION_DRAWER,
    DESCRIPTION.NAVIGATION_TAPS_GET_HELP,
  ),
  NAVIGATION_TAPS_SEND_FEEDBACK: generateOpt(
    EVENT_NAME.NAVIGATION_DRAWER,
    ACTIONS.NAVIGATION_DRAWER,
    DESCRIPTION.NAVIGATION_TAPS_SEND_FEEDBACK,
  ),
  NAVIGATION_TAPS_SETTINGS: generateOpt(
    EVENT_NAME.NAVIGATION_DRAWER,
    ACTIONS.NAVIGATION_DRAWER,
    DESCRIPTION.NAVIGATION_TAPS_SETTINGS,
  ),
  NAVIGATION_TAPS_REWARDS: generateOpt(
    EVENT_NAME.NAVIGATION_DRAWER,
    ACTIONS.NAVIGATION_DRAWER,
    DESCRIPTION.NAVIGATION_TAPS_REWARDS,
  ),
  NAVIGATION_TAPS_TRENDING: generateOpt(
    EVENT_NAME.NAVIGATION_DRAWER,
    ACTIONS.NAVIGATION_DRAWER,
    DESCRIPTION.NAVIGATION_TAPS_TRENDING,
  ),
  NAVIGATION_TAPS_LOGOUT: generateOpt(
    EVENT_NAME.NAVIGATION_DRAWER,
    ACTIONS.NAVIGATION_DRAWER,
    DESCRIPTION.NAVIGATION_TAPS_LOGOUT,
  ),
  // Dapp
  DAPP_BROWSER_OPTIONS: generateOpt(
    EVENT_NAME.DAPP_VIEW,
    ACTIONS.DAPP_VIEW,
    DESCRIPTION.DAPP_BROWSER_OPTIONS,
  ),
  DAPP_HOME: generateOpt(
    EVENT_NAME.DAPP_VIEW,
    ACTIONS.DAPP_VIEW,
    DESCRIPTION.DAPP_HOME,
  ),
  DAPP_ADD_TO_FAVORITE: generateOpt(
    EVENT_NAME.DAPP_VIEW,
    ACTIONS.DAPP_VIEW,
    DESCRIPTION.DAPP_ADD_TO_FAVORITE,
  ),
  DAPP_OPEN_IN_BROWSER: generateOpt(
    EVENT_NAME.DAPP_VIEW,
    ACTIONS.DAPP_VIEW,
    DESCRIPTION.DAPP_OPEN_IN_BROWSER,
  ),
  // Wallet
  WALLET_TOKENS: generateOpt(
    EVENT_NAME.WALLET_VIEW,
    ACTIONS.WALLET_VIEW,
    DESCRIPTION.WALLET_TOKENS,
  ),
  WALLET_COLLECTIBLES: generateOpt(
    EVENT_NAME.WALLET_VIEW,
    ACTIONS.WALLET_VIEW,
    DESCRIPTION.WALLET_COLLECTIBLES,
  ),
  WALLET_QR_SCANNER: generateOpt(
    EVENT_NAME.WALLET_VIEW,
    ACTIONS.WALLET_VIEW,
    DESCRIPTION.WALLET_QR_SCANNER,
  ),
  WALLET_COPIED_ADDRESS: generateOpt(
    EVENT_NAME.WALLET_VIEW,
    ACTIONS.WALLET_VIEW,
    DESCRIPTION.WALLET_COPIED_ADDRESS,
  ),
  WALLET_ADD_COLLECTIBLES: generateOpt(
    EVENT_NAME.WALLET_VIEW,
    ACTIONS.WALLET_VIEW,
    DESCRIPTION.WALLET_ADD_COLLECTIBLES,
  ),

  // Transactions
  TRANSACTIONS_CONFIRM_STARTED: generateOpt(
    EVENT_NAME.TRANSACTIONS,
    ACTIONS.CONFIRM_SCREEN,
    DESCRIPTION.TRANSACTIONS_CONFIRM_STARTED,
  ),
  TRANSACTIONS_EDIT_TRANSACTION: generateOpt(
    EVENT_NAME.TRANSACTIONS,
    ACTIONS.CONFIRM_SCREEN,
    DESCRIPTION.TRANSACTIONS_EDIT_TRANSACTION,
  ),
  TRANSACTIONS_CANCEL_TRANSACTION: generateOpt(
    EVENT_NAME.TRANSACTIONS,
    ACTIONS.CONFIRM_SCREEN,
    DESCRIPTION.TRANSACTIONS_CANCEL_TRANSACTION,
  ),
  TRANSACTIONS_COMPLETED_TRANSACTION: generateOpt(
    EVENT_NAME.TRANSACTIONS,
    ACTIONS.CONFIRM_SCREEN,
    DESCRIPTION.TRANSACTIONS_COMPLETED_TRANSACTION,
  ),
  TRANSACTIONS_CONFIRM_SIGNATURE: generateOpt(
    EVENT_NAME.TRANSACTIONS,
    ACTIONS.SIGN_SCREEN,
    DESCRIPTION.TRANSACTIONS_CONFIRM_SIGNATURE,
  ),
  TRANSACTIONS_CANCEL_SIGNATURE: generateOpt(
    EVENT_NAME.TRANSACTIONS,
    ACTIONS.SIGN_SCREEN,
    DESCRIPTION.TRANSACTIONS_CANCEL_SIGNATURE,
  ),
  // Accounts
  ACCOUNTS_ADDED_NEW_ACCOUNT: generateOpt(
    EVENT_NAME.ACCOUNTS,
    ACTIONS.ACCOUNTS_MODAL,
    DESCRIPTION.ACCOUNTS_ADDED_NEW_ACCOUNT,
  ),
  ACCOUNTS_IMPORTED_NEW_ACCOUNT: generateOpt(
    EVENT_NAME.ACCOUNTS,
    ACTIONS.ACCOUNTS_MODAL,
    DESCRIPTION.ACCOUNTS_IMPORTED_NEW_ACCOUNT,
  ),
  // Settings
  SETTINGS_GENERAL: generateOpt(
    EVENT_NAME.SETTINGS,
    ACTIONS.SETTINGS,
    DESCRIPTION.SETTINGS_GENERAL,
  ),
  SETTINGS_ADVANCED: generateOpt(
    EVENT_NAME.SETTINGS,
    ACTIONS.SETTINGS,
    DESCRIPTION.SETTINGS_ADVANCED,
  ),
  SETTINGS_SECURITY_AND_PRIVACY: generateOpt(
    EVENT_NAME.SETTINGS,
    ACTIONS.SETTINGS,
    DESCRIPTION.SETTINGS_SECURITY_AND_PRIVACY,
  ),
  SETTINGS_ABOUT: generateOpt(
    EVENT_NAME.SETTINGS,
    ACTIONS.SETTINGS,
    DESCRIPTION.SETTINGS_ABOUT,
  ),
  SETTINGS_EXPERIMENTAL: generateOpt(
    EVENT_NAME.SETTINGS,
    ACTIONS.SETTINGS,
    DESCRIPTION.SETTINGS_EXPERIMENTAL,
  ),
  SETTINGS_NOTIFICATIONS: generateOpt(
    EVENT_NAME.SETTINGS,
    ACTIONS.SETTINGS,
    DESCRIPTION.SETTINGS_NOTIFICATIONS,
  ),
  SETTINGS_BACKUP_AND_SYNC: generateOpt(
    EVENT_NAME.SETTINGS,
    ACTIONS.SETTINGS,
    DESCRIPTION.SETTINGS_BACKUP_AND_SYNC,
  ),
  // Receive Options
  RECEIVE_OPTIONS_SHARE_ADDRESS: generateOpt(
    EVENT_NAME.RECEIVE_OPTIONS,
    ACTIONS.RECEIVE_OPTIONS,
    DESCRIPTION.RECEIVE_OPTIONS_SHARE_ADDRESS,
  ),
  RECEIVE_OPTIONS_QR_CODE: generateOpt(
    EVENT_NAME.RECEIVE_OPTIONS,
    ACTIONS.RECEIVE_OPTIONS,
    DESCRIPTION.RECEIVE_OPTIONS_QR_CODE,
  ),
  RECEIVE_OPTIONS_PAYMENT_REQUEST: generateOpt(
    EVENT_NAME.RECEIVE_OPTIONS,
    ACTIONS.RECEIVE_OPTIONS,
    DESCRIPTION.RECEIVE_OPTIONS_PAYMENT_REQUEST,
  ),
  // Re-designed send
  SEND_STARTED: generateOpt(
    EVENT_NAME.SEND_STARTED,
    ACTIONS.SEND,
    DESCRIPTION.SEND_STARTED,
  ),
  SEND_ASSET_SELECTED: generateOpt(
    EVENT_NAME.SEND_ASSET_SELECTED,
    ACTIONS.SEND,
    DESCRIPTION.SEND_ASSET_SELECTED,
  ),
  SEND_AMOUNT_SELECTED: generateOpt(
    EVENT_NAME.SEND_AMOUNT_SELECTED,
    ACTIONS.SEND,
    DESCRIPTION.SEND_AMOUNT_SELECTED,
  ),
  SEND_RECIPIENT_SELECTED: generateOpt(
    EVENT_NAME.SEND_RECIPIENT_SELECTED,
    ACTIONS.SEND,
    DESCRIPTION.SEND_RECIPIENT_SELECTED,
  ),
  SEND_EXIT: generateOpt(
    EVENT_NAME.SEND_EXIT,
    ACTIONS.SEND,
    DESCRIPTION.SEND_EXIT,
  ),
  SEND_FLOW_ADDS_RECIPIENT: generateOpt(
    EVENT_NAME.SEND_FLOW,
    ACTIONS.SEND_FLOW,
    DESCRIPTION.SEND_FLOW_ADDS_RECIPIENT,
  ),
  SEND_FLOW_ADDS_AMOUNT: generateOpt(
    EVENT_NAME.SEND_FLOW,
    ACTIONS.SEND_FLOW,
    DESCRIPTION.SEND_FLOW_ADDS_AMOUNT,
  ),
  SEND_FLOW_ADJUSTS_TRANSACTION_FEE: generateOpt(
    EVENT_NAME.SEND_FLOW,
    ACTIONS.SEND_FLOW,
    DESCRIPTION.SEND_FLOW_ADJUSTS_TRANSACTION_FEE,
  ),
  SEND_FLOW_CANCEL: generateOpt(
    EVENT_NAME.SEND_FLOW,
    ACTIONS.SEND_FLOW,
    DESCRIPTION.SEND_FLOW_CANCEL,
  ),
  SEND_FLOW_SELECT_DUPLICATE_ADDRESS: generateOpt(
    EVENT_NAME.SEND_FLOW,
    ACTIONS.SEND_FLOW,
    DESCRIPTION.SEND_FLOW_SELECT_DUPLICATE_ADDRESS,
  ),
  // Dapp Interactions
  DAPP_APPROVE_SCREEN_VIEW_DETAILS: generateOpt(
    EVENT_NAME.DAPP_INTERACTIONS,
    ACTIONS.APPROVE_REQUEST,
    DESCRIPTION.DAPP_APPROVE_SCREEN_VIEW_DETAILS,
  ),
  // Swaps
  SWAPS_OPENED: generateOpt(
    EVENT_NAME.SWAPS_OPENED,
    ACTIONS.SWAP,
    DESCRIPTION.SWAPS,
  ),
  QUOTES_REQUESTED: generateOpt(
    EVENT_NAME.QUOTES_REQUESTED,
    ACTIONS.QUOTE,
    DESCRIPTION.SWAPS,
  ),
  QUOTES_RECEIVED: generateOpt(
    EVENT_NAME.QUOTES_RECEIVED,
    ACTIONS.QUOTE,
    DESCRIPTION.SWAPS,
  ),
  QUOTES_REQUEST_CANCELLED: generateOpt(
    EVENT_NAME.QUOTES_REQUEST_CANCELLED,
    ACTIONS.QUOTE,
    DESCRIPTION.SWAPS,
  ),
  ALL_AVAILABLE_QUOTES_OPENED: generateOpt(
    EVENT_NAME.ALL_AVAILABLE_QUOTES_OPENED,
    ACTIONS.QUOTE,
    DESCRIPTION.SWAPS,
  ),
  SWAP_STARTED: generateOpt(
    EVENT_NAME.SWAP_STARTED,
    ACTIONS.SWAP,
    DESCRIPTION.SWAPS,
  ),
  SWAP_COMPLETED: generateOpt(
    EVENT_NAME.SWAP_COMPLETED,
    ACTIONS.SWAP,
    DESCRIPTION.SWAPS,
  ),
  SWAP_FAILED: generateOpt(
    EVENT_NAME.SWAP_FAILED,
    ACTIONS.SWAP,
    DESCRIPTION.SWAPS,
  ),
  SWAP_TRACKING_FAILED: generateOpt(
    EVENT_NAME.SWAP_TRACKING_FAILED,
    ACTIONS.SWAP,
    DESCRIPTION.SWAPS,
  ),
  QUOTES_TIMED_OUT: generateOpt(
    EVENT_NAME.QUOTES_TIMED_OUT,
    ACTIONS.QUOTE,
    DESCRIPTION.SWAPS,
  ),
  NO_QUOTES_AVAILABLE: generateOpt(
    EVENT_NAME.NO_QUOTES_AVAILABLE,
    ACTIONS.QUOTE,
    DESCRIPTION.SWAPS,
  ),
  GAS_FEES_CHANGED: generateOpt(
    EVENT_NAME.GAS_FEES_CHANGED,
    ACTIONS.QUOTE,
    DESCRIPTION.SWAPS,
  ),
  EDIT_SPEND_LIMIT_OPENED: generateOpt(
    EVENT_NAME.EDIT_SPEND_LIMIT_OPENED,
    ACTIONS.QUOTE,
    DESCRIPTION.SWAPS,
  ),
  CUSTOM_TOKEN_IMPORTED: generateOpt(
    EVENT_NAME.TOKEN_IMPORTED,
    ACTIONS.SWAP,
    DESCRIPTION.SWAPS,
  ),
  BRIDGE_LINK_CLICKED: generateOpt(
    EVENT_NAME.BRIDGE_LINK_CLICKED,
    ACTIONS.BRIDGE,
    DESCRIPTION.BRIDGE,
  ),
  STAKE_BUTTON_CLICKED: generateOpt(
    EVENT_NAME.STAKE_BUTTON_CLICKED,
    ACTIONS.STAKE,
    DESCRIPTION.STAKE,
  ),
};

const MetaMetricsEvents = { ...events, ...legacyMetaMetricsEvents };

export { MetaMetricsEvents, EVENT_NAME };
