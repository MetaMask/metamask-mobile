'use strict';
import SampleFeatureView from '../pages/SampleFeatureView';
import { RegressionSampleFeature } from '../../../../../tests/tags';
import FixtureBuilder from '../../../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../../../tests/framework/fixtures/FixtureHelper';
import { navigateToSampleFeature } from '../utils';
import Assertions from '../../../../../tests/framework/Assertions';

describe(RegressionSampleFeature('Sample Feature'), () => {
  it('Navigates to sample feature', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await navigateToSampleFeature();
        // Verify Sample Feature screen is visible
        await SampleFeatureView.isVisible();
        await Assertions.checkIfVisible(SampleFeatureView.title);
        await Assertions.checkIfVisible(SampleFeatureView.description);
      },
    );
  });
});
