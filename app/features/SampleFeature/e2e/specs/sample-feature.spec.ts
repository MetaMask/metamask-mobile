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
import { loginToApp } from '../../../../../e2e/viewHelper';
import TabBarComponent from '../../../../../e2e/pages/wallet/TabBarComponent';
import SettingsView from '../../../../../e2e/pages/Settings/SettingsView';
import DeveloperOptionsView from '../../../../../e2e/pages/Settings/DeveloperOptions/DeveloperOptionsView';
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
    await loginToApp();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  it('Open sample feature', async () => {
    // Navigate to Settings
    await TabBarComponent.tapSettings();
    
    // Scroll to and tap Developer Options
    await SettingsView.scrollToDeveloperOptions();
    await SettingsView.tapDeveloperOptions();
    
    // Tap on Sample Feature
    await DeveloperOptionsView.tapSampleFeature();
    
    // Verify Sample Feature screen is visible
    await Assertions.checkIfVisible(SampleFeatureView.title);
    await SampleFeatureView.isVisible();
  });
});