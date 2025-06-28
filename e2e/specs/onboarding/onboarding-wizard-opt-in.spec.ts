'use strict';

import TestHelpers from '../../helpers';
import { Regression } from '../../tags';
import ProtectYourWalletView from '../../pages/Onboarding/ProtectYourWalletView';
import CreatePasswordView from '../../pages/Onboarding/CreatePasswordView';
import OnboardingView from '../../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../../pages/Onboarding/OnboardingCarouselView';
import MetaMetricsOptIn from '../../pages/Onboarding/MetaMetricsOptInView';
import OnboardingSuccessView from '../../pages/Onboarding/OnboardingSuccessView';
import WalletView from '../../pages/wallet/WalletView';
import SettingsView from '../../pages/Settings/SettingsView';
import SecurityAndPrivacy from '../../pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import LoginView from '../../pages/wallet/LoginView';
import SkipAccountSecurityModal from '../../pages/Onboarding/SkipAccountSecurityModal';
import ProtectYourWalletModal from '../../pages/Onboarding/ProtectYourWalletModal';
import { acceptTermOfUse, CreateNewWallet } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import CommonView from '../../pages/CommonView';
import Assertions from '../../utils/Assertions';
import ExperienceEnhancerBottomSheet from '../../pages/Onboarding/ExperienceEnhancerBottomSheet';
import { loadFixture, startFixtureServer } from '../../fixtures/fixture-helper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import {
  getEventsPayloads,
  findEvent,
  onboardingEvents,
} from '../analytics/helpers';
import SoftAssert from '../../utils/SoftAssert';
import { MockttpServer } from 'mockttp';
import { getFixturesServerPort, getMockServerPort } from '../../fixtures/utils';
import FixtureServer from '../../fixtures/fixture-server';
import { startMockServer } from '../../api-mocking/mock-server';
import { EventPayload } from '../analytics/helpers';

const PASSWORD = '12345678';

const testSpecificMock = {
  POST: [mockEvents.POST.segmentTrack],
};

const fixtureServer = new FixtureServer();

describe(
  Regression('Onboarding wizard opt-in, metametrics opt out from settings WITH ANALYTICS'),
  () => {
    let mockServer: MockttpServer;

    beforeAll(async () => {
      jest.setTimeout(150000);
      await TestHelpers.reverseServerPort();
      const fixture = new FixtureBuilder()
        .withOnboardingFixture()
        .build();
      await startFixtureServer(fixtureServer);
      await loadFixture(fixtureServer, { fixture });

      const mockServerPort = getMockServerPort();
      mockServer = await startMockServer(testSpecificMock, mockServerPort);
      
      await TestHelpers.launchApp({
        permissions: { notifications: 'YES' },
        launchArgs: {
          fixtureServerPort: `${getFixturesServerPort()}`,
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

      const events = await getEventsPayloads(mockServer, [
        onboardingEvents.ANALYTICS_PREFERENCE_SELECTED,
      ]);
      const softAssert = new SoftAssert();
      await softAssert.checkAndCollect(async () => {
        const e = findEvent(events, onboardingEvents.ANALYTICS_PREFERENCE_SELECTED) as EventPayload;
        await Assertions.checkIfValueIsDefined(e);
        await Assertions.checkIfObjectContains(e.properties, {
          has_marketing_consent: false,
          is_metrics_opted_in: true,
          location: 'onboarding_metametrics',
          updated_after_onboarding: false,
        });
      }, 'Analytics Preference Selected (opt-out) tracked');

      softAssert.throwIfErrors();

      // Restarting the app for the next test
      await device.terminateApp();
    });

    it('should relaunch and log in, verifying no events with metametrics disabled', async () => {
      await device.launchApp();
      await LoginView.enterPassword(PASSWORD);
      await Assertions.checkIfVisible(WalletView.container);
      await TestHelpers.delay(2000);
      // We should get the events without any event so that
      // we verify that the list is empty
      const events = await getEventsPayloads(mockServer, [
        onboardingEvents.ANALYTICS_PREFERENCE_SELECTED,
      ]);

      // We assert to X because X was the number of events fired before reaching this test
      await Assertions.checkIfArrayHasLength(events, 0);
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
