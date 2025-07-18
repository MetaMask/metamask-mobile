'use strict';
import SampleFeatureView from '../pages/SampleFeatureView';
import { Regression } from '../../../../../e2e/tags';
import TestHelpers from '../../../../../e2e/helpers';
import FixtureBuilder from '../../../../../e2e/fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../../../../e2e/fixtures/fixture-helper';
import { getFixturesServerPort } from '../../../../../e2e/fixtures/utils';
import FixtureServer from '../../../../../e2e/fixtures/fixture-server';
import { navigateToSampleFeature } from '../utils';
import Assertions from '../../../../../e2e/utils/Assertions';

const fixtureServer = new FixtureServer();

describe(Regression('Sample Feature'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder().build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await navigateToSampleFeature();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  it('displays counter feature', async () => {
    await Assertions.checkIfVisible(SampleFeatureView.counterTitle);
    await Assertions.checkIfVisible(SampleFeatureView.counterValue);
    await Assertions.checkIfVisible(SampleFeatureView.incrementButton);
  });

  it('increments counter', async () => {
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
  });
});
