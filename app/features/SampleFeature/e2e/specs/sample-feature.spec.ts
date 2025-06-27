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
import { 
  saveTestSuiteMetrics, 
  clearTestMetrics, 
  measureAction 
} from '../performance-utils';

const fixtureServer = new FixtureServer();

describe(Regression('Sample Feature'), () => {
  beforeAll(async () => {
    await measureAction('app-launch', async () => {
      await TestHelpers.reverseServerPort();
      const fixture = new FixtureBuilder().build();
      await startFixtureServer(fixtureServer);
      await loadFixture(fixtureServer, { fixture });
      await TestHelpers.launchApp({
        launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
      });
    });

    await measureAction('navigate-to-sample-feature', async () => {
      await navigateToSampleFeature();
    });
  });

  afterAll(async () => {
    // Save performance metrics for the test suite
    await saveTestSuiteMetrics('SampleFeature', 'basic-feature-tests');
    await stopFixtureServer(fixtureServer);
  });

  beforeEach(async () => {
    // Clear metrics before each test to start fresh
    clearTestMetrics();
  });

  it('Navigates to sample feature', async () => {
    await measureAction('verify-sample-feature-screen', async () => {
      // Verify Sample Feature screen is visible
      await SampleFeatureView.isVisible();
      await Assertions.checkIfVisible(SampleFeatureView.title);
      await Assertions.checkIfVisible(SampleFeatureView.description);
    });
  });
});
