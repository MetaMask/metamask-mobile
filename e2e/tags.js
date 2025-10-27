const tags = {
  SmokePerps: 'SmokePerps:',
  smokeAccounts: 'SmokeAccounts:',
  regressionAccounts: 'RegressionAccounts:',
  smokeCore: 'SmokeCore:',
  regressionConfirmations: 'RegressionConfirmations:',
  smokeConfirmationsRedesigned: 'SmokeConfirmationsRedesigned:',
  regressionConfirmationsRedesigned: 'RegressionConfirmationsRedesigned:',
  SmokeSwaps: 'SmokeSwaps:',
  smokeWalletUX: 'SmokeWalletUX:',
  regressionWalletUX: 'RegressionWalletUX:',
  SmokeRest: 'SmokeRest:',
  smokeAssets: 'SmokeAssets:',
  regressionAssets: 'RegressionAssets:',
  smokeIdentity: 'SmokeIdentity:',
  regressionIdentity: 'RegressionIdentity:',
  smokeMultiChainPermissions: 'SmokeMultiChainPermissions:',
  SmokeTrade: 'Trade:',
  RegressionTrade: 'RegressionTrade:',
  SmokeNetworkAbstractions: 'NetworkAbstractions:',
  regressionNetworkAbstractions: 'RegressionNetworkAbstractions:',
  SmokeWalletPlatform: 'WalletPlatform:',
  regressionWalletPlatform: 'RegressionWalletPlatform:',
  SmokeNetworkExpansion: 'NetworkExpansion:',
  regressionNetworkExpansion: 'RegressionNetworkExpansion:',
  smokeStake: 'SmokeStake:',
  smokeNotifications: 'SmokeNotifications:',
  smokeAnalytics: 'SmokeAnalytics:',
  smokeMultiChainAPI: 'SmokeMultiChainAPI:',
  FlaskBuildTests: 'FlaskBuildTests:',
  performance: 'Performance:',
  smokeCard: 'SmokeCard:',
  SmokePredictions: 'SmokePredictions',
  smokeRewards: 'SmokeRewards:',
  regressionSampleFeature: 'RegressionSampleFeature:',
};

/**
 * AI E2E Tag Selector Configuration
 *
 * Single source of truth for AI-powered E2E tag selection.
 * Each entry defines a smoke test tag and what it covers.
 *
 * When adding a new smoke tag for AI selection:
 * 1. Add the tag to the `tags` object above
 * 2. Add an entry here with the tag name and description
 */
const aiE2EConfig = [
  { tag: 'SmokeAccounts', description: 'Multi-account, account management' },
  { tag: 'SmokeConfirmations', description: 'Transaction confirmations, send/receive, signatures' },
  { tag: 'SmokeConfirmationsRedesigned', description: 'New confirmation UI as well as all confirmation flows' },
  { tag: 'SmokeIdentity', description: 'User identity, authentication' },
  { tag: 'SmokeNetworkAbstractions', description: 'Network layer, multi-chain' },
  { tag: 'SmokeNetworkExpansion', description: 'New networks, network config (Solana, Bitcoin, etc)' },
  { tag: 'SmokeTrade', description: 'Token swaps, DEX trading' },
  { tag: 'SmokeWalletPlatform', description: 'Core wallet, accounts, network switching' },
  { tag: 'SmokeCore', description: 'Core wallet functionality' },
  { tag: 'SmokeWalletUX', description: 'Wallet user experience and UI' },
  { tag: 'SmokeAssets', description: 'Asset management and display' },
  { tag: 'SmokeSwaps', description: 'Token swap functionality' },
  { tag: 'SmokeStake', description: 'Staking features' },
  { tag: 'SmokeCard', description: 'Card-related features' },
  { tag: 'SmokeNotifications', description: 'Notification system' },
];

const RegressionAccounts = (testName) =>
  `${tags.regressionAccounts} ${testName}`;
const SmokeAccounts = (testName) => `${tags.smokeAccounts} ${testName}`;
const SmokeCore = (testName) => `${tags.smokeCore} ${testName}`;
const RegressionConfirmations = (testName) =>
  `${tags.regressionConfirmations} ${testName}`;
const SmokeConfirmationsRedesigned = (testName) =>
  `${tags.smokeConfirmationsRedesigned} ${testName}`;
const RegressionConfirmationsRedesigned = (testName) =>
  `${tags.regressionConfirmationsRedesigned} ${testName}`;
const SmokeSwaps = (testName) => `${tags.SmokeSwaps} ${testName}`;
const SmokeStake = (testName) => `${tags.smokeStake} ${testName}`;
const SmokeAssets = (testName) => `${tags.smokeAssets} ${testName}`;
const RegressionAssets = (testName) => `${tags.regressionAssets} ${testName}`;
const SmokeIdentity = (testName) => `${tags.smokeIdentity} ${testName}`;
const RegressionIdentity = (testName) =>
  `${tags.regressionIdentity} ${testName}`;
const SmokeRamps = (testName) => `${tags.smokeRamps} ${testName}`;
const SmokeMultiChainPermissions = (testName) =>
  `${tags.smokeMultiChainPermissions} ${testName}`;
const SmokeMultiChainAPI = (testName) =>
  `${tags.smokeMultiChainAPI} ${testName}`;
const SmokeNotifications = (testName) =>
  `${tags.smokeNotifications} ${testName}`;
const SmokeAnalytics = (testName) => `${tags.smokeAnalytics} ${testName}`;

const SmokeTrade = (testName) => `${tags.SmokeTrade} ${testName}`;
const SmokePerps = (testName) => `${tags.SmokePerps} ${testName}`;
const RegressionTrade = (testName) => `${tags.RegressionTrade} ${testName}`;
const SmokeWalletPlatform = (testName) =>
  `${tags.SmokeWalletPlatform} ${testName}`;
const RegressionWalletPlatform = (testName) =>
  `${tags.regressionWalletPlatform} ${testName}`;
const RegressionNetworkAbstractions = (testName) =>
  `${tags.regressionNetworkAbstractions} ${testName}`;
const SmokeNetworkAbstractions = (testName) =>
  `${tags.SmokeNetworkAbstractions} ${testName}`;
const SmokeNetworkExpansion = (testName) =>
  `${tags.SmokeNetworkExpansion} ${testName}`;
const RegressionNetworkExpansion = (testName) =>
  `${tags.regressionNetworkExpansion} ${testName}`;
const SmokeCard = (testName) => `${tags.smokeCard} ${testName}`;
const SmokePredictions = (testName) => `${tags.SmokePredictions} ${testName}`;
const SmokeWalletUX = (testName) => `${tags.smokeWalletUX} ${testName}`;
const RegressionWalletUX = (testName) =>
  `${tags.regressionWalletUX} ${testName}`;
const FlaskBuildTests = (testName) => `${tags.FlaskBuildTests} ${testName}`;
const RegressionSampleFeature = (testName) =>
  `${tags.regressionSampleFeature} ${testName}`;
const SmokePerformance = (testName) => `${tags.performance} ${testName}`;
const SmokeRewards = (testName) => `${tags.smokeRewards} ${testName}`;

export {
  FlaskBuildTests,
  SmokePerps,
  RegressionAccounts,
  SmokeAccounts,
  SmokeCore,
  RegressionConfirmations,
  SmokeConfirmationsRedesigned,
  RegressionConfirmationsRedesigned,
  SmokeSwaps,
  SmokeStake,
  SmokeAssets,
  RegressionAssets,
  SmokeIdentity,
  RegressionIdentity,
  SmokeMultiChainPermissions,
  SmokeTrade,
  RegressionNetworkAbstractions,
  SmokeNetworkAbstractions,
  SmokeNetworkExpansion,
  RegressionNetworkExpansion,
  SmokeWalletPlatform,
  RegressionWalletPlatform,
  RegressionTrade,
  SmokeRamps,
  SmokeNotifications,
  SmokeAnalytics,
  SmokeMultiChainAPI,
  SmokePerformance,
  SmokeCard,
  SmokePredictions,
  SmokeWalletUX,
  RegressionWalletUX,
  SmokeRewards,
  RegressionSampleFeature,
  tags,
  aiE2EConfig,
};
