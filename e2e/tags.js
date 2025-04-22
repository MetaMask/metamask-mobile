const tags = {
  regression: 'Regression:',
  smokeAccounts: 'SmokeAccounts:',
  smokeCore: 'SmokeCore:',
  smokeConfirmations: 'SmokeConfirmations:',
  smokeConfirmationsRedesigned: 'SmokeConfirmationsRedesigned:',
  SmokeSwaps: 'SmokeSwaps:',
  SmokeRest: 'SmokeRest:',
  smokeAssets: 'smokeAssets:',
  smokeIdentity: 'SmokeIdentity:',
  smokeMultiChainPermissions: 'SmokeMultiChainPermissions:',
  SmokeTrade: 'Trade:',
  SmokeNetworkAbstractions: 'NetworkAbstractions:',
  SmokeWalletPlatform: 'WalletPlatform:',
  SmokeNetworkExpansion: 'NetworkExpansion:',
  smokeStake: 'SmokeStake:',
  smokeNotifications: 'SmokeNotifications:',
  smokeAnalytics: 'SmokeAnalytics:',
};

const Regression = (testName) => `${tags.regression} ${testName}`;
const SmokeAccounts = (testName) => `${tags.smokeAccounts} ${testName}`;
const SmokeCore = (testName) => `${tags.smokeCore} ${testName}`;
const SmokeConfirmations = (testName) =>
  `${tags.smokeConfirmations} ${testName}`;
const SmokeConfirmationsRedesigned = (testName) =>
  `${tags.smokeConfirmationsRedesigned} ${testName}`;
const SmokeSwaps = (testName) => `${tags.SmokeSwaps} ${testName}`;
const SmokeStake = (testName) => `${tags.smokeStake} ${testName}`;
const SmokeAssets = (testName) => `${tags.smokeAssets} ${testName}`;
const SmokeIdentity = (testName) => `${tags.smokeIdentity} ${testName}`;
const SmokeRamps = (testName) => `${tags.smokeRamps} ${testName}`;
const SmokeMultiChainPermissions = (testName) =>
  `${tags.smokeMultiChainPermissions} ${testName}`;
const SmokeNotifications = (testName) =>
  `${tags.smokeNotifications} ${testName}`;
const SmokeAnalytics = (testName) => `${tags.smokeAnalytics} ${testName}`;

const SmokeTrade = (testName) => `${tags.SmokeTrade} ${testName}`;
const SmokeWalletPlatform = (testName) =>
  `${tags.SmokeWalletPlatform} ${testName}`;

const SmokeNetworkAbstractions = (testName) =>
  `${tags.SmokeNetworkAbstractions} ${testName}`;
const SmokeNetworkExpansion = (testName) =>
  `${tags.SmokeNetworkExpansion} ${testName}`;

export {
  Regression,
  SmokeAccounts,
  SmokeCore,
  SmokeConfirmations,
  SmokeConfirmationsRedesigned,
  SmokeSwaps,
  SmokeStake,
  SmokeAssets,
  SmokeIdentity,
  SmokeMultiChainPermissions,
  SmokeTrade,
  SmokeNetworkAbstractions,
  SmokeNetworkExpansion,
  SmokeWalletPlatform,
  SmokeRamps,
  SmokeNotifications,
  SmokeAnalytics,
};
