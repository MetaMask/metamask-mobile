'use strict';
import SampleFeatureView from '../pages/SampleFeatureView';
import { RegressionSampleFeature } from '../../../../../e2e/tags';
import FixtureBuilder from '../../../../../e2e/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../../../e2e/framework/fixtures/FixtureHelper';
import { navigateToSampleFeature } from '../utils';
import Assertions from '../../../../../e2e/framework/Assertions';

describe(RegressionSampleFeature('Sample Feature Counter'), () => {
  it('displays counter feature', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await navigateToSampleFeature();
        await Assertions.checkIfVisible(SampleFeatureView.counterTitle);
        await Assertions.checkIfVisible(SampleFeatureView.counterValue);
        await Assertions.checkIfVisible(SampleFeatureView.incrementButton);
      },
    );
  });

  it('increments counter', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await navigateToSampleFeature();
        await Assertions.checkIfVisible(SampleFeatureView.counterTitle);
        await Assertions.checkIfVisible(SampleFeatureView.counterValue);
        await Assertions.checkIfVisible(SampleFeatureView.incrementButton);

        await SampleFeatureView.tapIncrementButton();
        await Assertions.checkIfElementToHaveText(
          SampleFeatureView.counterValue,
          'Value: 1',
        );

        await SampleFeatureView.tapIncrementButton();
        await Assertions.checkIfElementToHaveText(
          SampleFeatureView.counterValue,
          'Value: 2',
        );
      },
    );
  });
});
