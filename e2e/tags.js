const tags = {
  regression: 'Regression',
  smoke: 'Smoke',
};
const Smoke = (testName) => `${tags.smoke} ${testName}`;
const Regression = (testName) => `${tags.regression} ${testName}`;

export { Smoke, Regression };
