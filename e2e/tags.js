const tags = {
  regressionPerps: 'RegressionPerps:',
  smokeAccounts: 'SmokeAccounts:',
  regressionAccounts: 'RegressionAccounts:',
  smokeCore: 'SmokeCore:',
  smokeConfirmations: 'SmokeConfirmations:',
  regressionConfirmations: 'RegressionConfirmations:',
  smokeConfirmationsRedesigned: 'SmokeConfirmationsRedesigned:',
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
  smokePerps: 'SmokePerps:',
  FlaskBuildTests: 'FlaskBuildTests:',
  performance: 'Performance:',
  smokeCard: 'SmokeCard:',
};

const RegressionAccounts = (testName) =>
  `${tags.regressionAccounts} ${testName}`;
const SmokeAccounts = (testName) => `${tags.smokeAccounts} ${testName}`;
const SmokeCore = (testName) => `${tags.smokeCore} ${testName}`;
const SmokeConfirmations = (testName) =>
  `${tags.smokeConfirmations} ${testName}`;
const RegressionConfirmations = (testName) =>
  `${tags.regressionConfirmations} ${testName}`;
const SmokeConfirmationsRedesigned = (testName) =>
  `${tags.smokeConfirmationsRedesigned} ${testName}`;
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
const SmokeWalletUX = (testName) => `${tags.smokeWalletUX} ${testName}`;
const RegressionWalletUX = (testName) =>
  `${tags.regressionWalletUX} ${testName}`;
const FlaskBuildTests = (testName) => `${tags.FlaskBuildTests} ${testName}`;

const SmokePerps = (testName) => `${tags.smokePerps} ${testName}`;

const SmokePerformance = (testName) => `${tags.performance} ${testName}`;

export {
  FlaskBuildTests,
  RegressionAccounts,
  SmokeAccounts,
  SmokeCore,
  SmokeConfirmations,
  RegressionConfirmations,
  SmokeConfirmationsRedesigned,
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
  SmokePerps,
  SmokePerformance,
  SmokeCard,
  SmokeWalletUX,
  RegressionWalletUX,
};
