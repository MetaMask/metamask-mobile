/**
 * E2E Smoke Test Tags for AI-powered test selection.
 *
 * These descriptions help the AI selector understand what each tag covers.
 *
 * Selection logic is defined in: tests/tools/e2e-ai-analyzer/modes/select-tags/prompt.ts
 */
const smokeTags = {
  smokeAccounts: {
    tag: 'SmokeAccounts:',
    description:
      'Tests account security and multi-account management within the wallet. Covers Secret Recovery Phrase (SRP) protection flows including the reveal quiz validation in Settings, SRP export from both Settings and account action menus, and wallet details credential display. Also tests multi-account workflows: creating new HD wallet accounts, adding QR-based hardware wallet accounts, importing accounts via private key, account switching and selection, account renaming, and managing account visibility in the account list. Integrates with the AccountSelector and RevealPrivateCredential components. When changes touch multi-SRP architecture, account list, or SRP export flows, also select SmokeWalletPlatform and SmokeIdentity. Related to SmokeWalletPlatform for multi-SRP architecture and SmokeIdentity for account sync features.',
  },
  smokeConfirmations: {
    tag: 'SmokeConfirmations:',
    description:
      'Tests the transaction and signature confirmation UI system. Covers signature request types: personal_sign messages, Sign-In with Ethereum (SIWE/EIP-4361), and typed data signing (EIP-712 V1/V3/V4). Tests Blockaid security alert integration for detecting malicious signature requests. Validates smart contract interactions including contract deployment, method calls, and token approvals (ERC-20 approve, increaseAllowance, ERC-721/ERC-1155 setApprovalForAll). Tests transaction sending for native tokens (ETH), ERC-20 tokens, and Solana SPL tokens. Covers gas fee customization (EIP-1559 and legacy), transaction simulation previews, and advanced EIP-7702 account abstraction features like batch transactions and gas fee token payments. Also tests per-dApp network selection within confirmations. Swap and bridge flows (SmokeSwap), stake/lending flows (SmokeStake), and fiat/card flows (SmokeMoney) often require confirmations—when selecting those tags, also select SmokeConfirmations where applicable. Solana transaction/signing flows (SmokeNetworkExpansion) also hit confirmations—when selecting SmokeNetworkExpansion for Solana flows, also select SmokeConfirmations. Integrates with SmokeNetworkExpansion for cross-chain transactions.',
  },
  smokeIdentity: {
    tag: 'SmokeIdentity:',
    description:
      'Tests MetaMask Identity and cross-device synchronization via the Profile Sync Controller. Covers account syncing features: enabling/disabling sync via settings toggle, multi-SRP account synchronization, automatic account discovery with balance detection to find used accounts, adding and renaming accounts with sync propagation, and proper exclusion of imported (non-HD) accounts from sync. Also tests contact/address book syncing: contact sync toggle, creating and syncing user contacts, and verifying contact persistence after app restart and across devices. Tests the backup and sync onboarding flow. When changes touch account sync or multi-SRP flows, also select SmokeAccounts and SmokeWalletPlatform. Related to SmokeAccounts for account management and SmokeWalletPlatform for multi-SRP architecture.',
  },
  smokeNetworkAbstractions: {
    tag: 'SmokeNetworkAbstractions:',
    description:
      'Tests the network management and selection layer. Covers the Network Manager UI: viewing available networks, selecting/deselecting networks, managing network enabled state, and the network selector bottom sheet. Tests adding popular networks (Ethereum, Linea, Polygon, Arbitrum, etc.) and custom RPC networks. Validates multi-chain token filtering to show relevant tokens based on the selected network for both EVM chains and Solana. Tests the chain permission system for dApps: granting/revoking chain access, handling dApp chain switch requests, and modifying permitted chains per dApp. Also covers notification settings flows. When changes affect dApp chain permissions or multi-chain selection, also select SmokeNetworkExpansion and SmokeMultiChainAPI. Integrates with SmokeNetworkExpansion for multi-chain provider support and SmokeMultiChainAPI for session-based permissions.',
  },
  smokeNetworkExpansion: {
    tag: 'SmokeNetworkExpansion:',
    description:
      'Tests non-EVM blockchain support and multi-chain provider architecture. Focuses on Solana Wallet Standard compliance: dApp connect/disconnect flows, displaying Solana account addresses to dApps, account switching with dApp notification, session persistence after page refresh, SOL token transfers, and Solana message signing. Tests the multi-chain provider system enabling simultaneous connections from a single dApp to multiple blockchain networks (e.g., EVM and Solana together). Covers initial connection permission flows for multi-chain dApps and account selection across chain types. When selecting SmokeNetworkExpansion for Solana transaction or signing flows, also select SmokeConfirmations (Solana confirmations). Integrates with SmokeNetworkAbstractions for chain permissions and SmokeMultiChainAPI for session-based multi-chain.',
  },
  smokeSwap: {
    tag: 'SmokeSwap:',
    description:
      'Tests swap and bridge trading flows. Covers token swaps (e.g., ETH to USDC), quote fetching, bridge actions, deep link entry into swap/bridge screens, gasless swaps, and swap completion validation in activities. Includes unified wallet actions entry to trade flows. When selecting SmokeSwap, also select SmokeConfirmations (transaction confirmations are part of the flow). Related to SmokeWalletPlatform for activity display.',
  },
  smokeStake: {
    tag: 'SmokeStake:',
    description:
      'Tests wallet staking and lending flows. Covers stake entry from wallet actions, lending deposits, and lending withdrawals. Validates on-chain operations initiated from wallet surfaces. When selecting SmokeStake, also select SmokeConfirmations (transaction confirmations are part of the flow). Related to SmokeWalletPlatform for activity display.',
  },
  smokeWalletPlatform: {
    tag: 'SmokeWalletPlatform:',
    description:
      'Tests core wallet platform features and services. Covers the Trending discovery tab: search functionality, browsing content feeds (Predictions, Tokens, Perps, Sites sections), and browser navigation integration. Trending is the connecting point for all subsections—changes to Perps, Predictions, or Tokens views (headers, lists, full views) that are embedded in Trending affect this tag. Tests transaction history: displaying incoming/outgoing ETH transactions, token transfer details, and privacy mode support to hide sensitive balances. Validates wallet lifecycle analytics tracking for new wallet creation and SRP import events. Tests multi-SRP wallet architecture: importing additional Secret Recovery Phrases, adding accounts to different SRPs, exporting SRP from Settings and account action menus, and managing separate account hierarchies per SRP. Covers account deletion flows and EVM provider event handling (accountsChanged, chainChanged) for dApp communication. Integrates with SmokeAccounts for account management, SmokeSwap/SmokeStake/SmokeMoney for activity display, SmokePerps (Perps section inside Trending), and SmokeIdentity for sync features.',
  },
  smokeMoney: {
    tag: 'SmokeMoney:',
    description:
      'Tests MetaMask Card and fiat on/off-ramp (ramps) flows. Card: home screen, navbar entry, Add Funds (Deposit/Swap paths), Advanced Card Management, and card analytics. Ramps: unified buy, sell/off-ramp, region-aware flows, deep links into buy/sell, limits and unsupported-network handling. Card is gated by experimental flags. When selecting SmokeMoney for Card Add Funds or similar flows that execute swaps, also select SmokeSwap and SmokeConfirmations. When changes touch wallet home or actions entry to buy/sell, also select SmokeWalletPlatform.',
  },
  smokePerps: {
    tag: 'SmokePerps:',
    description:
      'Tests perpetuals (perps) futures trading functionality on Arbitrum One. Covers the Add Funds flow to deposit USDC into the Perps trading account, balance verification after deposits, and balance updates reflecting correctly in the Perps interface. Tests with multi-account setups and existing user states (non-first-time users). Entry point is via the Perps button in the TradeWalletActions menu. Perps is also a section inside the Trending tab (SmokeWalletPlatform); changes to Perps views (headers, lists, full views, e.g. PerpsHomeView, PerpsMarketListView, PerpsWithdrawView) affect Trending. When selecting SmokePerps, also select SmokeWalletPlatform (Trending section) and SmokeConfirmations (Add Funds deposits are on-chain transactions). Integrates with SmokeSwap for the trading category entry.',
  },
  smokeMultiChainAPI: {
    tag: 'SmokeMultiChainAPI:',
    description:
      'Tests the CAIP-25 multi-chain session API for dApp permission management across networks. Covers wallet_createSession: creating sessions for single chains (Ethereum only), multiple EVM chains (Ethereum + Polygon + Base), and all EVM networks. Tests wallet_getSession for retrieving current session scopes and verifying session structure. Validates wallet_sessionChanged event emission when network permissions are modified. Tests wallet_revokeSession for completely clearing dApp sessions. Verifies session data consistency with EIP155 scope format for chain identification. Supports both EVM-only and EVM + Solana multi-chain scope combinations. When selecting SmokeMultiChainAPI, also select SmokeNetworkAbstractions (permission UI) and SmokeNetworkExpansion (multi-chain provider). Integrates with SmokeNetworkAbstractions for permission system and SmokeNetworkExpansion for multi-chain support.',
  },
  smokePredictions: {
    tag: 'SmokePredictions:',
    description:
      'Tests Polymarket prediction market integration. Covers the full position lifecycle: opening new positions on available markets (sports, crypto, events), cashing out open positions early, and claiming winnings from resolved markets. Tests balance synchronization after prediction transactions, verifying USDC balance updates correctly. Validates the Positions tab for viewing all open positions and the Activities tab for transaction history. Tests error handling scenarios: API failures when Polymarket is unavailable and geographic restriction handling for unsupported regions. Entry point is via the Predict button in TradeWalletActions. Predictions is also a section inside the Trending tab (SmokeWalletPlatform); changes to Predictions views (headers, lists, full views) affect Trending. When selecting SmokePredictions, also select SmokeWalletPlatform (Trending section) and SmokeConfirmations (opening/closing positions are on-chain transactions). Integrates with SmokeSwap for the trading category.',
  },
  smokeSeedlessOnboarding: {
    tag: 'SmokeSeedlessOnboarding:',
    description:
      'Tests seedless onboarding flows using social login providers (Google and Apple). Covers new user wallet creation via Google and Apple OAuth, existing user detection with the Account Already Exists screen, lock and unlock after social login onboarding, wallet reset from the login screen, and importing an additional SRP after seedless onboarding. Tests the SeedlessOnboardingController mock integration, OAuth token exchange, and the full onboarding lifecycle including password creation, MetaMetrics opt-in, and wallet home arrival. When changes touch OAuth, SeedlessOnboardingController, social login UI, or the onboarding sheet, select this tag. Related to SmokeWalletPlatform for wallet lifecycle and SmokeIdentity for account sync after social login.',
  },
  smokeBrowser: {
    tag: 'SmokeBrowser:',
    description:
      'Tests the in-app browser (BrowserTab/BrowserUrlBar WebView). Covers browser navigation: visiting invalid URLs and returning home, ENS domain resolution via mocked IPFS gateway, and cross-origin redirect URL bar updates. Tests browser security: camera permission prompts within WebView and history disclosure prevention. Tests file download handling from web pages. Tests phishing detection via mocked dapp-scanning API responses. Browser tests use local HTML fixture servers (DappServer) and testSpecificMock for API mocking rather than live external websites. When changes touch BrowserTab, BrowserUrlBar, WebView configuration, or dapp-scanning integration, select this tag. Related to SmokeWalletPlatform for Trending browser navigation integration.',
  },
  smokeSnaps: {
    tag: 'SmokeSnaps:',
    description:
      'Tests the MetaMask Snaps extensibility platform. Covers snap lifecycle: installation from npm, enabling/disabling installed snaps, and removal with keyring warnings for snaps managing accounts. Tests snap Ethereum provider access: eth_chainId, eth_accounts, personal_sign, eth_signTypedData_v4, and wallet_switchEthereumChain. Validates snap dialog systems for alerts and confirmations with approve/cancel flows. Tests snap capabilities: persistent state management (snap_manageState for set/get/clear), network access for external API calls, WebAssembly (WASM) execution, interactive UI rendering with JSX components, cronjob scheduling for background tasks, entropy generation for randomness, file handling, and BIP-32/BIP-44 key derivation for account management. Also covers preinstalled snaps, snap UI links, lifecycle events, user preference access, image handling in snap UIs, and background event listeners. Snaps enable non-EVM chain support like Solana account derivation.',
  },
};

const flaskTags = {};

// Other tags to run on demand or for specific purposes.
const otherTags = {
  regressionAccounts: 'RegressionAccounts:',
  regressionConfirmations: 'RegressionConfirmations:',
  regressionIdentity: 'RegressionIdentity:',
  regressionNetworkAbstractions: 'RegressionNetworkAbstractions:',
  regressionWalletPlatform: 'RegressionWalletPlatform:',
  regressionNetworkExpansion: 'RegressionNetworkExpansion:',
  regressionAssets: 'RegressionAssets:',
  regressionWalletUX: 'RegressionWalletUX:',
  regressionTrade: 'RegressionTrade:',
  regressionSampleFeature: 'RegressionSampleFeature:',
  performance: 'Performance:',
  fixtureValidation: 'FixtureValidation:',
};

// Smoke test tag functions
const SmokeAccounts = (testName) =>
  `${smokeTags.smokeAccounts.tag} ${testName}`;
const SmokeConfirmations = (testName) =>
  `${smokeTags.smokeConfirmations.tag} ${testName}`;
const SmokeIdentity = (testName) =>
  `${smokeTags.smokeIdentity.tag} ${testName}`;
const SmokeNetworkAbstractions = (testName) =>
  `${smokeTags.smokeNetworkAbstractions.tag} ${testName}`;
const SmokeNetworkExpansion = (testName) =>
  `${smokeTags.smokeNetworkExpansion.tag} ${testName}`;
const SmokeSwap = (testName) => `${smokeTags.smokeSwap.tag} ${testName}`;
const SmokeStake = (testName) => `${smokeTags.smokeStake.tag} ${testName}`;
const SmokeWalletPlatform = (testName) =>
  `${smokeTags.smokeWalletPlatform.tag} ${testName}`;
const SmokeMoney = (testName) => `${smokeTags.smokeMoney.tag} ${testName}`;
const SmokePerps = (testName) => `${smokeTags.smokePerps.tag} ${testName}`;
const SmokeMultiChainAPI = (testName) =>
  `${smokeTags.smokeMultiChainAPI.tag} ${testName}`;
const SmokePredictions = (testName) =>
  `${smokeTags.smokePredictions.tag} ${testName}`;
const SmokeSeedlessOnboarding = (testName) =>
  `${smokeTags.smokeSeedlessOnboarding.tag} ${testName}`;
const SmokeBrowser = (testName) => `${smokeTags.smokeBrowser.tag} ${testName}`;
const SmokeSnaps = (testName) => `${smokeTags.smokeSnaps.tag} ${testName}`;
// Other test tags functions.
const RegressionAccounts = (testName) =>
  `${otherTags.regressionAccounts} ${testName}`;
const RegressionConfirmations = (testName) =>
  `${otherTags.regressionConfirmations} ${testName}`;
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
const SmokePerformance = (testName) => `${otherTags.performance} ${testName}`;
const FixtureValidation = (testName) =>
  `${otherTags.fixtureValidation} ${testName}`;

export {
  smokeTags,
  flaskTags,
  SmokeAccounts,
  SmokeConfirmations,
  SmokeIdentity,
  SmokeNetworkAbstractions,
  SmokeNetworkExpansion,
  SmokeSwap,
  SmokeStake,
  SmokeWalletPlatform,
  SmokeMoney,
  SmokePerps,
  SmokeMultiChainAPI,
  SmokePredictions,
  SmokeSeedlessOnboarding,
  SmokeBrowser,
  RegressionAccounts,
  RegressionConfirmations,
  RegressionIdentity,
  RegressionNetworkAbstractions,
  RegressionWalletPlatform,
  RegressionNetworkExpansion,
  RegressionAssets,
  RegressionWalletUX,
  RegressionTrade,
  RegressionSampleFeature,
  SmokeSnaps,
  SmokePerformance,
  FixtureValidation,
};
