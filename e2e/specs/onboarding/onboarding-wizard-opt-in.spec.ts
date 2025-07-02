'use strict';

import TestHelpers from '../../helpers';
import { Regression } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import SettingsView from '../../pages/Settings/SettingsView';
import SecurityAndPrivacy from '../../pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import LoginView from '../../pages/wallet/LoginView';
import {CreateNewWallet } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import CommonView from '../../pages/CommonView';
import Assertions from '../../utils/Assertions';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import {
  getEventsPayloads,
  onboardingEvents,
  filterEvents,
 EventPayload } from '../analytics/helpers';
import SoftAssert from '../../utils/SoftAssert';
import { MockttpServer } from 'mockttp';
import { getMockServerPort } from '../../fixtures/utils';
import { startMockServer } from '../../api-mocking/mock-server';
import Utilities from '../../utils/Utilities';

const PASSWORD = '12345678';

const testSpecificMock = {
  POST: [mockEvents.POST.segmentTrack],
};

//const fixtureServer = new FixtureServer();

describe(
  Regression('Onboarding wizard opt-in, metametrics opt out from settings WITH ANALYTICS'),
  () => {
    let mockServer: MockttpServer;
    let eventsTrackedUntilDisableAnalytics: EventPayload[];

    beforeAll(async () => {
      jest.setTimeout(150000);
      await TestHelpers.reverseServerPort();
      //const fixture = new FixtureBuilder()
      //  .withOnboardingFixture()
      //  .build();
      //await startFixtureServer(fixtureServer);
      // await loadFixture(fixtureServer, { fixture });

      const mockServerPort = getMockServerPort();
      mockServer = await startMockServer(testSpecificMock, mockServerPort);

      await TestHelpers.launchApp({
        permissions: { notifications: 'YES' },
        launchArgs: {
          //fixtureServerPort: `${getFixturesServerPort()}`,
          mockServerPort: `${mockServerPort}`,
        },
      });
    });

    it('should create a new wallet', async () => {
      await CreateNewWallet({ optInToMetrics: true });
    });

    it('should check that metametrics is enabled in settings', async () => {
      await TestHelpers.delay(2000); // Wait for UI to stabilize
      await TabBarComponent.tapSettings();
      await TestHelpers.delay(2000); // Wait for settings to load
      await SettingsView.tapSecurityAndPrivacy();
      await SecurityAndPrivacy.scrollToMetaMetrics();
      await TestHelpers.delay(2000);
      await Assertions.checkIfToggleIsOn(SecurityAndPrivacy.metaMetricsToggle as Promise<Detox.IndexableNativeElement>);
    });

    it('should disable metametrics and track preference change', async () => {
      await SecurityAndPrivacy.tapMetaMetricsToggle();
      await TestHelpers.delay(1500);
      // we may have a race condition here
      // We can stop any actions and still check for the events afterwards
      await CommonView.tapOkAlert();
      await Assertions.checkIfToggleIsOff(SecurityAndPrivacy.metaMetricsToggle as Promise<Detox.IndexableNativeElement>);

      const events = await getEventsPayloads(mockServer);
      console.warn('events after disabling analytics', events);

      const softAssert = new SoftAssert();
      await softAssert.checkAndCollect(async () => {
        const e = filterEvents(events, onboardingEvents.ANALYTICS_PREFERENCE_SELECTED) as EventPayload[];
        await Assertions.checkIfValueIsDefined(e);
        await Assertions.checkIfArrayHasLength(e, 1);
        await Assertions.checkIfObjectContains(e[0].properties, {
          has_marketing_consent: false,
          is_metrics_opted_in: true,
          location: 'onboarding_metametrics',
          updated_after_onboarding: false,
        });
      }, 'Analytics Preference Selected (opt-in) was tracked during onboarding and is not tracked after disabling analytics');

      softAssert.throwIfErrors();

      // We will be asserting this on the next test so that we make sure that
      // restarting the app keeps the analytics preference set to off
      eventsTrackedUntilDisableAnalytics = events;

      // Restarting the app for the next test
      await device.terminateApp();
      await TestHelpers.delay(2000);
      await device.launchApp({
        launchArgs: {
          mockServerPort: `${getMockServerPort()}`,
          detoxURLBlacklistRegex: Utilities.BlacklistURLs,
        },
      });
      await TestHelpers.delay(3000);
    });

    it('should relaunch and log in, verifying no new MetaMetrics events were sent', async () => {
      await LoginView.enterPassword(PASSWORD);
      await Assertions.checkIfVisible(WalletView.container);
      await TestHelpers.delay(2000);

      const eventsAfterRelaunch = await getEventsPayloads(mockServer);
      await Assertions.checkIfArrayHasLength(eventsAfterRelaunch, eventsTrackedUntilDisableAnalytics.length);
    });

    it('should verify metametrics is turned off', async () => {
      // We don't need synchronization here as we just need to navigate to the toggle
      await device.disableSynchronization();
      await TestHelpers.delay(500); // Wait for UI to stabilize
      await TabBarComponent.tapSettings();
      await TestHelpers.delay(500); // Wait for settings to load
      await SettingsView.tapSecurityAndPrivacy(); // ANIMATION HERE, we need to be careful with this

      // Theres an animation here that we need to wait for
      // we need to be careful with this and should find a better way to handle this
      await TestHelpers.delay(500);

      await SecurityAndPrivacy.scrollToMetaMetrics();
      await Assertions.checkIfToggleIsOff(SecurityAndPrivacy.metaMetricsToggle as Promise<Detox.IndexableNativeElement>);
    });
  }
);
