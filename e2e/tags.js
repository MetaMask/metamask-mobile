/**
 * E2E Smoke Test Tags for AI-powered test selection.
 *
 * These descriptions help the AI selector understand what each tag covers.
 * Tags marked "Reserved" are placeholders without active tests - their functionality
 * is currently covered by other active tags as noted in the description.
 *
 * Selection logic is defined in: tests/tools/e2e-ai-analyzer/modes/select-tags/prompt.ts
 */
const smokeTags = {
  smokeAccounts: {
    tag: 'SmokeAccounts:',
    description:
      'Tests account security and multi-account management within the wallet. Covers Secret Recovery Phrase (SRP) protection flows including the reveal quiz validation in Settings, SRP export from both Settings and account action menus, and wallet details credential display. Also tests multi-account workflows: creating new HD wallet accounts, adding QR-based hardware wallet accounts, importing accounts via private key, account switching and selection, account renaming, and managing account visibility in the account list. Integrates with the AccountSelector and RevealPrivateCredential components. Related to SmokeWalletPlatform for multi-SRP architecture and SmokeIdentity for account sync features.',
  },
  smokeCore: {
    tag: 'SmokeCore:',
    description:
      'Reserved for core wallet infrastructure tests. Intended to cover React Native framework stability, app state persistence, navigation architecture, deep link routing, and app lifecycle events. Currently excluded from AI selection - infrastructure verification is distributed across active tags like SmokeAccounts, SmokeConfirmationsRedesigned, and SmokeWalletPlatform.',
  },
  smokeConfirmationsRedesigned: {
    tag: 'SmokeConfirmationsRedesigned:',
    description:
      'Tests the redesigned transaction and signature confirmation UI system. Covers signature request types: personal_sign messages, Sign-In with Ethereum (SIWE/EIP-4361), and typed data signing (EIP-712 V1/V3/V4). Tests Blockaid security alert integration for detecting malicious signature requests. Validates smart contract interactions including contract deployment, method calls, and token approvals (ERC-20 approve, increaseAllowance, ERC-721/ERC-1155 setApprovalForAll). Tests transaction sending for native tokens (ETH), ERC-20 tokens, and Solana SPL tokens. Covers gas fee customization (EIP-1559 and legacy), transaction simulation previews, and advanced EIP-7702 account abstraction features like batch transactions and gas fee token payments. Also tests per-dApp network selection within confirmations. Integrates with SmokeTrade for swap/bridge confirmations and SmokeNetworkExpansion for cross-chain transactions.',
  },
  smokeIdentity: {
    tag: 'SmokeIdentity:',
    description:
      'Tests MetaMask Identity and cross-device synchronization via the Profile Sync Controller. Covers account syncing features: enabling/disabling sync via settings toggle, multi-SRP account synchronization, automatic account discovery with balance detection to find used accounts, adding and renaming accounts with sync propagation, and proper exclusion of imported (non-HD) accounts from sync. Also tests contact/address book syncing: contact sync toggle, creating and syncing user contacts, and verifying contact persistence after app restart and across devices. Tests the backup and sync onboarding flow. Related to SmokeAccounts for account management and SmokeWalletPlatform for multi-SRP architecture.',
  },
  smokeNetworkAbstractions: {
    tag: 'SmokeNetworkAbstractions:',
    description:
      'Tests the network management and selection layer. Covers the Network Manager UI: viewing available networks, selecting/deselecting networks, managing network enabled state, and the network selector bottom sheet. Tests adding popular networks (Ethereum, Linea, Polygon, Arbitrum, etc.) and custom RPC networks. Validates multi-chain token filtering to show relevant tokens based on the selected network for both EVM chains and Solana. Tests the chain permission system for dApps: granting/revoking chain access, handling dApp chain switch requests, and modifying permitted chains per dApp. Also covers notification settings flows. Integrates with SmokeNetworkExpansion for multi-chain provider support and SmokeMultiChainAPI for session-based permissions.',
  },
  smokeNetworkExpansion: {
    tag: 'SmokeNetworkExpansion:',
    description:
      'Tests non-EVM blockchain support and multi-chain provider architecture. Focuses on Solana Wallet Standard compliance: dApp connect/disconnect flows, displaying Solana account addresses to dApps, account switching with dApp notification, session persistence after page refresh, SOL token transfers, and Solana message signing. Tests the multi-chain provider system enabling simultaneous connections from a single dApp to multiple blockchain networks (e.g., EVM and Solana together). Covers initial connection permission flows for multi-chain dApps and account selection across chain types. Integrates with SmokeNetworkAbstractions for chain permissions and SmokeConfirmationsRedesigned for Solana transaction confirmations.',
  },
  smokeTrade: {
    tag: 'SmokeTrade:',
    description:
      'Tests DeFi trading and financial features accessed via the Trade wallet actions menu. Covers token swaps: executing swaps (e.g., ETH to USDC) through the unified swap interface, quote fetching, and swap completion verification in activities. Tests cross-chain bridging between networks (e.g., Ethereum mainnet to Base). Validates gasless swap execution via Smart Transactions where users do not pay gas directly. Tests native ETH staking flows initiated from the wallet actions menu. Covers deep link navigation into swap and bridge screens from external sources. Validates analytics event tracking for swap started, swap completed, quotes received, and bridge events. The TradeWalletActions bottom sheet provides entry points to Swap, Bridge, Perps, Predictions, and Earn features. Related to SmokeConfirmationsRedesigned for transaction confirmations and SmokeWalletPlatform for activity display.',
  },
  smokeWalletPlatform: {
    tag: 'SmokeWalletPlatform:',
    description:
      'Tests core wallet platform features and services. Covers the Trending discovery tab: search functionality, browsing content feeds (Predictions, Tokens, Perps, Sites sections), and browser navigation integration. Tests transaction history: displaying incoming/outgoing ETH transactions, token transfer details, and privacy mode support to hide sensitive balances. Validates wallet lifecycle analytics tracking for new wallet creation and SRP import events. Tests multi-SRP wallet architecture: importing additional Secret Recovery Phrases, adding accounts to different SRPs, exporting SRP from Settings and account action menus, and managing separate account hierarchies per SRP. Covers account deletion flows and EVM provider event handling (accountsChanged, chainChanged) for dApp communication. Integrates with SmokeAccounts for account management, SmokeTrade for activity display, and SmokeIdentity for sync features.',
  },
  smokeWalletUX: {
    tag: 'SmokeWalletUX:',
    description:
      'Reserved for wallet user experience and interface tests covering Settings screens, notification preferences, theme customization, language/locale settings, currency display preferences, privacy settings, and general UI/UX flows. Notification-related tests currently use SmokeNetworkAbstractions tag.',
  },
  smokeAssets: {
    tag: 'SmokeAssets:',
    description:
      'Reserved for asset management and display tests covering token list display, NFT gallery and details, custom token importing, token hiding/unhiding, token price and balance display, asset search, portfolio value calculations, and DeFi position display. Some DeFi-related tests currently use SmokeNetworkAbstractions tag.',
  },
  smokeSwaps: {
    tag: 'SmokeSwaps:',
    description:
      'Reserved for dedicated token swap tests. Currently swap functionality is tested under the SmokeTrade tag which covers swaps, bridges, and other trading features through the unified Trade interface.',
  },
  smokeStake: {
    tag: 'SmokeStake:',
    description:
      'Reserved for dedicated staking tests covering pooled staking, solo staking, validator selection, staking rewards, and unstaking flows. Currently staking functionality is tested under the SmokeTrade tag which covers the staking action flow from the Trade wallet actions menu.',
  },
  smokeCard: {
    tag: 'SmokeCard:',
    description:
      'Tests MetaMask Card integration for crypto-to-fiat spending. Covers the Card home screen display showing card status and balance, the Add Funds button with Deposit and Swap funding options, and Advanced Card Management which opens the external card dashboard in the browser. Tests the Card navbar button for quick navigation to Card home. Validates card-related analytics events: Card Button Viewed, Card Home Clicked, Card Add Funds Clicked, and Card Advanced Management Clicked. The Card feature is controlled by experimental feature flags. Integrates with SmokeTrade for funding via swaps.',
  },
  smokeNotifications: {
    tag: 'SmokeNotifications:',
    description:
      'Reserved for notification system tests covering push notification setup, notification preferences, in-app notification display, transaction status notifications, and notification history. Currently notification settings flows are tested under SmokeNetworkAbstractions tag.',
  },
  smokeRewards: {
    tag: 'SmokeRewards:',
    description:
      'Tests the MetaMask Rewards incentive program. Covers the rewards opt-in onboarding flow with its multi-screen carousel, claiming sign-up bonuses, displaying reward tier levels (e.g., Level 1 "Origin"), and showing earned points balance. Tests the Activity tab displaying reward-earning actions including sign-up bonuses, perpetuals trading rewards, swap rewards, and referral activities. Note: Tests are currently skipped pending rewards system stabilization. When enabled, integrates with SmokeTrade for trading reward triggers.',
  },
  smokePerps: {
    tag: 'SmokePerps:',
    description:
      'Tests perpetuals (perps) futures trading functionality on Arbitrum One. Covers the Add Funds flow to deposit USDC into the Perps trading account, balance verification after deposits, and balance updates reflecting correctly in the Perps interface. Tests with multi-account setups and existing user states (non-first-time users). Entry point is via the Perps button in the TradeWalletActions menu. Integrates with SmokeTrade for the trading category entry and SmokeWalletPlatform for balance display.',
  },
  smokeRamps: {
    tag: 'SmokeRamps:',
    description:
      'Tests fiat on-ramp (buy crypto) and off-ramp (sell crypto) features. Covers the off-ramp token amount input screen: direct amount entry via keypad, percentage quick-select buttons (25%, 50%, 75%, Max), and amount correction via delete. Tests region-aware on-ramp flows with mocked regional settings (e.g., France) and payment method availability. Validates deep link navigation into buy flows from external sources. On-ramp tests include limits validation and handling of unsupported networks. Integrates with SmokeWalletPlatform for wallet actions entry point.',
  },
  smokeMultiChainPermissions: {
    tag: 'SmokeMultiChainPermissions:',
    description:
      'Reserved for dedicated multi-chain permission management tests. Currently multi-chain permission flows are tested under SmokeNetworkAbstractions (chain permission system, dApp chain switching) and SmokeNetworkExpansion (initial connection permissions, multi-provider connections) tags.',
  },
  smokeAnalytics: {
    tag: 'SmokeAnalytics:',
    description:
      'Reserved for dedicated analytics validation tests. Currently analytics event tracking is tested within feature-specific tags: SmokeWalletPlatform tests wallet creation/import analytics, SmokeTrade tests swap/bridge analytics events, and SmokeCard tests card engagement analytics.',
  },
  smokeMultiChainAPI: {
    tag: 'SmokeMultiChainAPI:',
    description:
      'Tests the CAIP-25 multi-chain session API for dApp permission management across networks. Covers wallet_createSession: creating sessions for single chains (Ethereum only), multiple EVM chains (Ethereum + Polygon + Base), and all EVM networks. Tests wallet_getSession for retrieving current session scopes and verifying session structure. Validates wallet_sessionChanged event emission when network permissions are modified. Tests wallet_revokeSession for completely clearing dApp sessions. Verifies session data consistency with EIP155 scope format for chain identification. Supports both EVM-only and EVM + Solana multi-chain scope combinations. Integrates with SmokeNetworkAbstractions for permission system and SmokeNetworkExpansion for multi-chain support.',
  },
  smokePredictions: {
    tag: 'SmokePredictions:',
    description:
      'Tests Polymarket prediction market integration. Covers the full position lifecycle: opening new positions on available markets (sports, crypto, events), cashing out open positions early, and claiming winnings from resolved markets. Tests balance synchronization after prediction transactions, verifying USDC balance updates correctly. Validates the Positions tab for viewing all open positions and the Activities tab for transaction history. Tests error handling scenarios: API failures when Polymarket is unavailable and geographic restriction handling for unsupported regions. Entry point is via the Predict button in TradeWalletActions. Integrates with SmokeWalletPlatform for Trending tab market discovery and SmokeTrade for the trading category.',
  },
};

const flaskTags = {
  flaskBuildTests: {
    tag: 'FlaskBuildTests:',
    description:
      'Tests the MetaMask Snaps extensibility platform. Covers snap lifecycle: installation from npm, enabling/disabling installed snaps, and removal with keyring warnings for snaps managing accounts. Tests snap Ethereum provider access: eth_chainId, eth_accounts, personal_sign, eth_signTypedData_v4, and wallet_switchEthereumChain. Validates snap dialog systems for alerts and confirmations with approve/cancel flows. Tests snap capabilities: persistent state management (snap_manageState for set/get/clear), network access for external API calls, WebAssembly (WASM) execution, interactive UI rendering with JSX components, cronjob scheduling for background tasks, entropy generation for randomness, file handling, and BIP-32/BIP-44 key derivation for account management. Also covers preinstalled snaps, snap UI links, lifecycle events, user preference access, image handling in snap UIs, and background event listeners. Snaps enable non-EVM chain support like Solana account derivation.',
  },
};

// Performance tests (AI-selectable for performance impact analysis)
// Tags are area-specific and tool-agnostic - the same tag can be used by Detox, Appwright, or any other tool
const performanceTags = {
  performanceAccountList: {
    tag: 'PerformanceAccountList:',
    description:
      'Account list rendering and dismissal performance - covers account selector, multi-account scenarios, token load impact',
  },
  performanceNetworkList: {
    tag: 'PerformanceNetworkList:',
    description:
      'Network list rendering and dismissal performance - covers network selector, multi-network scenarios',
  },
  performanceOnboarding: {
    tag: 'PerformanceOnboarding:',
    description:
      'Onboarding flow performance - covers wallet creation, SRP import, initial setup screens, and first-time user experience',
  },
  performanceLogin: {
    tag: 'PerformanceLogin:',
    description:
      'Login and unlock performance - covers password entry, biometric unlock, session restoration, and time to wallet ready state',
  },
  performanceSwaps: {
    tag: 'PerformanceSwaps:',
    description:
      'Swap flow performance - covers quote fetching, token selection, swap execution, and transaction completion times',
  },
  performanceLaunch: {
    tag: 'PerformanceLaunch:',
    description:
      'App launch performance - covers cold start time, warm start time, splash screen duration, and time to interactive',
  },
  performanceAssetLoading: {
    tag: 'PerformanceAssetLoading:',
    description:
      'Asset and balance loading performance - covers token list rendering, balance fetching, NFT gallery loading, and portfolio value calculation',
  },
  performancePredict: {
    tag: 'PerformancePredict:',
    description:
      'Predict market performance - covers prediction market list loading, market details, deposit flows, and balance display',
  },
  performancePreps: {
    tag: 'PerformancePreps:',
    description:
      'Perpetuals trading performance - covers perps market loading, position management, add funds flow, and order execution',
  },
};

// Other tags to run on demand or for specific purposes.
const otherTags = {
  regressionAccounts: 'RegressionAccounts:',
  regressionConfirmations: 'RegressionConfirmations:',
  regressionConfirmationsRedesigned: 'RegressionConfirmationsRedesigned:',
  regressionIdentity: 'RegressionIdentity:',
  regressionNetworkAbstractions: 'RegressionNetworkAbstractions:',
  regressionWalletPlatform: 'RegressionWalletPlatform:',
  regressionNetworkExpansion: 'RegressionNetworkExpansion:',
  regressionAssets: 'RegressionAssets:',
  regressionWalletUX: 'RegressionWalletUX:',
  regressionTrade: 'RegressionTrade:',
  regressionSampleFeature: 'RegressionSampleFeature:',
  performance: 'Performance:',
};

// Smoke test tag functions
const SmokeAccounts = (testName) =>
  `${smokeTags.smokeAccounts.tag} ${testName}`;
const SmokeCore = (testName) => `${smokeTags.smokeCore.tag} ${testName}`;
const SmokeConfirmationsRedesigned = (testName) =>
  `${smokeTags.smokeConfirmationsRedesigned.tag} ${testName}`;
const SmokeIdentity = (testName) =>
  `${smokeTags.smokeIdentity.tag} ${testName}`;
const SmokeNetworkAbstractions = (testName) =>
  `${smokeTags.smokeNetworkAbstractions.tag} ${testName}`;
const SmokeNetworkExpansion = (testName) =>
  `${smokeTags.smokeNetworkExpansion.tag} ${testName}`;
const SmokeTrade = (testName) => `${smokeTags.smokeTrade.tag} ${testName}`;
const SmokeWalletPlatform = (testName) =>
  `${smokeTags.smokeWalletPlatform.tag} ${testName}`;
const SmokeWalletUX = (testName) =>
  `${smokeTags.smokeWalletUX.tag} ${testName}`;
const SmokeAssets = (testName) => `${smokeTags.smokeAssets.tag} ${testName}`;
const SmokeSwaps = (testName) => `${smokeTags.smokeSwaps.tag} ${testName}`;
const SmokeStake = (testName) => `${smokeTags.smokeStake.tag} ${testName}`;
const SmokeCard = (testName) => `${smokeTags.smokeCard.tag} ${testName}`;
const SmokeNotifications = (testName) =>
  `${smokeTags.smokeNotifications.tag} ${testName}`;
const SmokeRewards = (testName) => `${smokeTags.smokeRewards.tag} ${testName}`;
const SmokePerps = (testName) => `${smokeTags.smokePerps.tag} ${testName}`;
const SmokeRamps = (testName) => `${smokeTags.smokeRamps.tag} ${testName}`;
const SmokeMultiChainPermissions = (testName) =>
  `${smokeTags.smokeMultiChainPermissions.tag} ${testName}`;
const SmokeAnalytics = (testName) =>
  `${smokeTags.smokeAnalytics.tag} ${testName}`;
const SmokeMultiChainAPI = (testName) =>
  `${smokeTags.smokeMultiChainAPI.tag} ${testName}`;
const SmokePredictions = (testName) =>
  `${smokeTags.smokePredictions.tag} ${testName}`;
// Other test tags functions.
const RegressionAccounts = (testName) =>
  `${otherTags.regressionAccounts} ${testName}`;
const RegressionConfirmations = (testName) =>
  `${otherTags.regressionConfirmations} ${testName}`;
const RegressionConfirmationsRedesigned = (testName) =>
  `${otherTags.regressionConfirmationsRedesigned} ${testName}`;
const RegressionIdentity = (testName) =>
  `${otherTags.regressionIdentity} ${testName}`;
const RegressionNetworkAbstractions = (testName) =>
  `${otherTags.regressionNetworkAbstractions} ${testName}`;
const RegressionWalletPlatform = (testName) =>
  `${otherTags.regressionWalletPlatform} ${testName}`;
const RegressionNetworkExpansion = (testName) =>
  `${otherTags.regressionNetworkExpansion} ${testName}`;
const RegressionAssets = (testName) =>
  `${otherTags.regressionAssets} ${testName}`;
const RegressionWalletUX = (testName) =>
  `${otherTags.regressionWalletUX} ${testName}`;
const RegressionTrade = (testName) =>
  `${otherTags.regressionTrade} ${testName}`;
const RegressionSampleFeature = (testName) =>
  `${otherTags.regressionSampleFeature} ${testName}`;
const FlaskBuildTests = (testName) =>
  `${flaskTags.flaskBuildTests.tag} ${testName}`;
const SmokePerformance = (testName) => `${otherTags.performance} ${testName}`;

export {
  smokeTags,
  flaskTags,
  performanceTags,
  SmokeAccounts,
  SmokeCore,
  SmokeConfirmationsRedesigned,
  SmokeIdentity,
  SmokeNetworkAbstractions,
  SmokeNetworkExpansion,
  SmokeTrade,
  SmokeWalletPlatform,
  SmokeWalletUX,
  SmokeAssets,
  SmokeSwaps,
  SmokeStake,
  SmokeCard,
  SmokeNotifications,
  SmokeRewards,
  SmokePerps,
  SmokeRamps,
  SmokeMultiChainPermissions,
  SmokeAnalytics,
  SmokeMultiChainAPI,
  SmokePredictions,
  RegressionAccounts,
  RegressionConfirmations,
  RegressionConfirmationsRedesigned,
  RegressionIdentity,
  RegressionNetworkAbstractions,
  RegressionWalletPlatform,
  RegressionNetworkExpansion,
  RegressionAssets,
  RegressionWalletUX,
  RegressionTrade,
  RegressionSampleFeature,
  FlaskBuildTests,
  SmokePerformance,
};
