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
};
