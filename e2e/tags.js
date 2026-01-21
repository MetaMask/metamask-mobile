// Smoke tests to run on every PR.
const smokeTags = {
  smokeAccounts: {
    tag: 'SmokeAccounts:',
    description: 'Multi-account, account management, BIP-44, Keyrings',
  },
  smokeCore: {
    tag: 'SmokeCore:',
    description:
      'Core wallet functionality, framework, react native, app state, navigation',
  },
  smokeConfirmationsRedesigned: {
    tag: 'SmokeConfirmationsRedesigned:',
    description: 'New confirmation UI as well as all confirmation flows',
  },
  smokeIdentity: {
    tag: 'SmokeIdentity:',
    description: 'Sync accounts, sync contacts',
  },
  smokeNetworkAbstractions: {
    tag: 'SmokeNetworkAbstractions:',
    description: 'Network layer, multi-chain',
  },
  smokeNetworkExpansion: {
    tag: 'SmokeNetworkExpansion:',
    description: 'New networks, network config (Solana, Bitcoin, etc)',
  },
  smokeTrade: {
    tag: 'SmokeTrade:',
    description: 'Token swaps, bridge, DEX trading',
  },
  smokeWalletPlatform: {
    tag: 'SmokeWalletPlatform:',
    description: 'Core wallet, accounts, network switching',
  },
  smokeWalletUX: {
    tag: 'SmokeWalletUX:',
    description: 'Wallet user experience and UI, settings, notifications, etc',
  },
  smokeAssets: {
    tag: 'SmokeAssets:',
    description: 'Asset management and display, NFTs, token details, etc',
  },
  smokeSwaps: { tag: 'SmokeSwaps:', description: 'Token swap functionality' },
  smokeStake: { tag: 'SmokeStake:', description: 'Staking features' },
  smokeCard: { tag: 'SmokeCard:', description: 'Card-related features' },
  smokeNotifications: {
    tag: 'SmokeNotifications:',
    description: 'Notification system',
  },
  smokeRewards: {
    tag: 'SmokeRewards:',
    description: 'Rewards and incentive features',
  },
  smokePerps: { tag: 'SmokePerps:', description: 'Perpetuals trading' },
  smokeRamps: {
    tag: 'SmokeRamps:',
    description: 'On/off ramp features, buy/sell',
  },
  smokeMultiChainPermissions: {
    tag: 'SmokeMultiChainPermissions:',
    description: 'Multi-chain permissions, permission management',
  },
  smokeAnalytics: { tag: 'SmokeAnalytics:', description: 'Analytics' },
  smokeMultiChainAPI: {
    tag: 'SmokeMultiChainAPI:',
    description: 'Multi-chain API',
  },
  smokePredictions: {
    tag: 'SmokePredictions:',
    description: 'Predictions features, prediction market',
  },
};

// Flask tests (AI-selectable, Android only)
const flaskTags = {
  flaskBuildTests: {
    tag: 'FlaskBuildTests:',
    description:
      'MetaMask Snaps functionality tests (Android only) - covers snap permissions, state management, ethereum provider, and snap UI components',
  },
};

// Performance tests (AI-selectable for performance impact analysis)
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
  performanceAppwright: {
    tag: 'PerformanceAppwright:',
    description:
      'Appwright performance tests - covers login flows, balance loading, swap flows, onboarding, launch times, and critical user journeys',
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
