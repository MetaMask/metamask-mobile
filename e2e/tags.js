const tags = {
  regression: 'Regression',
  smokeCore: 'SmokeCore',
  smokeConfirmations: 'SmokeConfirmations',
  SmokeSwaps: 'SmokeSwaps',
  SmokeRest: 'SmokeRest',
};

const Regression = (testName) => `${tags.regression} ${testName}`;
const SmokeCore = (testName) => `${tags.smokeCore} ${testName}`;
const SmokeConfirmations = (testName) =>
  `${tags.smokeConfirmations} ${testName}`;
const SmokeSwaps = (testName) => `${tags.SmokeSwaps} ${testName}`;

export { Regression, SmokeCore, SmokeConfirmations, SmokeSwaps };
