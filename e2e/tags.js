const tags = {
  regression: 'Regression',
  smoke: 'Smoke',
  confirmations: 'Confirmations',
};
const Smoke = (testName) => `${tags.smoke} ${testName}`;
const Regression = (testName) => `${tags.regression} ${testName}`;
const Confirmations = (testName) => `${tags.confirmations} ${testName}`;

export { Smoke, Regression, Confirmations };
