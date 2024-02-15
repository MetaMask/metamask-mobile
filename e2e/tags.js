const tags = {
  Regression: 'Regression',
  SmokeCore: 'SmokeCore',
  RegressionCore: 'RegressionCore',
  SmokeConfirmations: 'SmokeConfirmations',
  RegressionConfirmations: 'RegressionConfirmations',
  SmokeSwaps: 'SmokeSwaps',
  RegressionSwaps: 'RegressionSwaps',
  SmokeRest: 'SmokeRest',
  SmokeAccounts: 'SmokeAccounts',
  RegressionAccounts: 'RegressionAccounts',
};

const Regression = (testName) => `${tags.Regression} ${testName}`;
const SmokeCore = (testName) => `${tags.SmokeCore} ${testName}`;
const RegressionCore = (testName) => `${tags.RegressionCore} ${testName}`;
const SmokeConfirmations = (testName) =>
  `${tags.SmokeConfirmations} ${testName}`;
const RegressionConfirmations = (testName) =>
  `${tags.RegressionConfirmations} ${testName}`;
const SmokeSwaps = (testName) => `${tags.SmokeSwaps} ${testName}`;
const RegressionSwaps = (testName) => `${tags.RegressionSwaps} ${testName}`;
const SmokeAccounts = (testName) => `${tags.SmokeAccounts} ${testName}`;
const RegressionAccounts = (testName) =>
  `${tags.RegressionAccounts} ${testName}`;

export {
  Regression,
  SmokeCore,
  RegressionCore,
  SmokeConfirmations,
  RegressionConfirmations,
  SmokeSwaps,
  RegressionSwaps,
  SmokeAccounts,
  RegressionAccounts,
};
