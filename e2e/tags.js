const tags = {
  regression: 'Regression:',
  smokeAccounts: 'SmokeAccounts:',
  smokeCore: 'SmokeCore:',
  smokeConfirmations: 'SmokeConfirmations:',
  smokeConfirmationsRedesigned: 'SmokeConfirmationsRedesigned:',
  SmokeSwaps: 'SmokeSwaps:',
  SmokeRest: 'SmokeRest:',
  smokeAssets: 'smokeAssets:',
  smokeIdentity: 'smokeIdentity:',
  smokeMultiChainPermissions: 'SmokeMultiChainPermissions:',
  smokeRamps: 'SmokeRamps:',
  smokeStake: 'SmokeStake:',
  smokeNotifications: 'SmokeNotifications:',
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
  SmokeRamps,
  SmokeNotifications,
};
