const tags = {
  regression: 'Regression',
  smoke: 'Smoke',
  smokeCore: 'SmokeCore',
  smokeConfirmations: 'SmokeConfirmations',
  SmokeSwaps: 'SmokeSwaps',
  SmokeRest: 'SmokeRest',
};

const Smoke = (testName) => `${tags.smoke} ${testName}`;
const Regression = (testName) => `${tags.regression} ${testName}`;
const SmokeCore = (testName) => `${tags.smokeCore} ${testName}`;
const SmokeConfirmations = (testName) =>
  `${tags.smokeConfirmations} ${testName}`;
const SmokeSwaps = (testName) => `${tags.SmokeSwaps} ${testName}`;
const SmokeRest = (testName) => `${tags.SmokeRest} ${testName}`;

export {
  Smoke,
  Regression,
  SmokeCore,
  SmokeConfirmations,
  SmokeSwaps,
  SmokeRest,
};
