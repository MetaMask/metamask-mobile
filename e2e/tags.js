const tags = {
  regression: 'Regression',
  smokeAccounts: 'SmokeAccounts',
  smokeCore: 'SmokeCore',
  smokeConfirmations: 'SmokeConfirmations',
  smokeConfirmations2: 'SmokeConfirmations2',
  SmokeSwaps: 'SmokeSwaps',
  SmokeRest: 'SmokeRest',
  smokeAssets: 'smokeAssets',
  smokeNotifications: 'smokeNotifications',
};

const Regression = (testName) => `${tags.regression} ${testName}`;
const SmokeAccounts = (testName) => `${tags.smokeAccounts} ${testName}`;
const SmokeCore = (testName) => `${tags.smokeCore} ${testName}`;
const SmokeConfirmations = (testName) =>
  `${tags.smokeConfirmations} ${testName}`;
const SmokeConfirmations2 = (testName) =>
  `${tags.smokeConfirmations2} ${testName}`;
const SmokeSwaps = (testName) => `${tags.SmokeSwaps} ${testName}`;
const SmokeAssets = (testName) => `${tags.smokeAssets} ${testName}`;
const SmokeNotifications = (testName) =>
  `${tags.smokeNotifications} ${testName}`;

export {
  Regression,
  SmokeAccounts,
  SmokeCore,
  SmokeConfirmations,
  SmokeConfirmations2,
  SmokeSwaps,
  SmokeAssets,
  SmokeNotifications,
};
