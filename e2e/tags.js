const tags = {
  regression: 'Regression:',
  smokeAccounts: 'SmokeAccounts:',
  smokeCore: 'SmokeCore:',
  smokeConfirmations: 'SmokeConfirmations:',
  SmokeSwaps: 'SmokeSwaps:',
  SmokeRest: 'SmokeRest:',
  smokeAssets: 'smokeAssets:',
  smokeIdentity: 'smokeIdentity:',
  smokeMultiChainPermissions: 'SmokeMultiChainPermissions:',
  smokeRamps: 'SmokeRamps:',
};

const Regression = (testName) => `${tags.regression} ${testName}`;
const SmokeAccounts = (testName) => `${tags.smokeAccounts} ${testName}`;
const SmokeCore = (testName) => `${tags.smokeCore} ${testName}`;
const SmokeConfirmations = (testName) =>
  `${tags.smokeConfirmations} ${testName}`;
const SmokeSwaps = (testName) => `${tags.SmokeSwaps} ${testName}`;
const SmokeAssets = (testName) => `${tags.smokeAssets} ${testName}`;
const SmokeIdentity = (testName) => `${tags.smokeIdentity} ${testName}`;
const SmokeRamps = (testName) => `${tags.smokeRamps} ${testName}`;

const SmokeMultiChainPermissions = (testName) =>
  `${tags.smokeMultiChainPermissions} ${testName}`;
export {
  Regression,
  SmokeAccounts,
  SmokeCore,
  SmokeConfirmations,
  SmokeSwaps,
  SmokeAssets,
  SmokeIdentity,
  SmokeMultiChainPermissions,
  SmokeRamps,
};
