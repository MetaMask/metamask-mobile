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
import { acceptTermOfUse } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import CommonView from '../../pages/CommonView';
import Assertions from '../../utils/Assertions';
import ExperienceEnhancerBottomSheet from '../../pages/Onboarding/ExperienceEnhancerBottomSheet';
import { withFixtures } from '../../fixtures/fixture-helper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import {
  getEventsPayloads,
  findEvent,
} from '../analytics/helpers';
import SoftAssert from '../../utils/SoftAssert';

const PASSWORD = '12345678';

const testSpecificMock = {
  POST: [mockEvents.POST.segmentTrack],
};

const EVENT_NAMES = {
  ANALYTICS_PREFERENCE_SELECTED: 'Analytics Preference Selected',
  WELCOME_MESSAGE_VIEWED: 'Welcome Message Viewed',
  ONBOARDING_STARTED: 'Onboarding Started',
  WALLET_CREATION_ATTEMPTED: 'Wallet Creation Attempted',
  WALLET_CREATED: 'Wallet Created',
  WALLET_PASSWORD_CREATED: 'Wallet Password Created',
  WALLET_SETUP_COMPLETED: 'Wallet Setup Completed',
  WALLET_SECURITY_SKIP_INITIATED: 'Wallet Security Skip Initiated',
  WALLET_SECURITY_SKIP_CONFIRMED: 'Wallet Security Skip Confirmed',
  WALLET_SECURITY_REMINDER_DISMISSED: 'Wallet Security Reminder Dismissed',
};

describe(
  Regression('Onboarding wizard opt-in, metametrics opt out from settings WITH ANALYTICS'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(150000);
      await TestHelpers.reverseServerPort();
    });

    it('should accept the terms of use and track onboarding start events', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().withOnboardingFixture().build(),
          restartDevice: true,
          testSpecificMock,
          launchArgs: {
            sendMetaMetricsinE2E: true,
          },
        },
        async ({ mockServer }) => {
          await OnboardingCarouselView.tapOnGetStartedButton();
          await acceptTermOfUse();
          await OnboardingView.tapCreateWallet();

          const events = await getEventsPayloads(mockServer, [
            EVENT_NAMES.WELCOME_MESSAGE_VIEWED,
            EVENT_NAMES.ONBOARDING_STARTED,
          ]);
          const softAssert = new SoftAssert();
          softAssert.checkAndCollect(async () => {
            await Assertions.checkIfValueIsPresent(findEvent(events, EVENT_NAMES.WELCOME_MESSAGE_VIEWED));
          }, 'Welcome Message Viewed tracked');

          softAssert.checkAndCollect(async () => {
            await Assertions.checkIfValueIsPresent(findEvent(events, EVENT_NAMES.ONBOARDING_STARTED));
          }, 'Onboarding Started tracked');

          softAssert.throwIfErrors();
        }
      );
    });

    it('should create a new wallet and track creation events', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: false,
          testSpecificMock,
          launchArgs: {
            sendMetaMetricsinE2E: true,
          },
        },
        async ({ mockServer }) => {
          await Assertions.checkIfVisible(CreatePasswordView.container);
          await CreatePasswordView.enterPassword(PASSWORD);
          await CreatePasswordView.reEnterPassword(PASSWORD);
          await CreatePasswordView.tapIUnderstandCheckBox();
          await CreatePasswordView.tapCreatePasswordButton();

          const events = await getEventsPayloads(mockServer, [
            EVENT_NAMES.WALLET_CREATION_ATTEMPTED,
            EVENT_NAMES.WALLET_CREATED,
            EVENT_NAMES.WALLET_PASSWORD_CREATED,
            EVENT_NAMES.WALLET_SETUP_COMPLETED,
          ]);
          const softAssert = new SoftAssert();
          softAssert.checkAndCollect(async () => {
            await Assertions.checkIfValueIsPresent(findEvent(events, EVENT_NAMES.WALLET_CREATION_ATTEMPTED));
          }, 'Wallet Creation Attempted tracked');

          softAssert.checkAndCollect(async () => {
            await Assertions.checkIfValueIsPresent(findEvent(events, EVENT_NAMES.WALLET_CREATED));
          }, 'Wallet Created tracked');

          softAssert.checkAndCollect(async () => {
            await Assertions.checkIfValueIsPresent(findEvent(events, EVENT_NAMES.WALLET_PASSWORD_CREATED));
          }, 'Wallet Password Created tracked');

          softAssert.checkAndCollect(async () => {
            await Assertions.checkIfValueIsPresent(findEvent(events, EVENT_NAMES.WALLET_SETUP_COMPLETED));
          }, 'Wallet Setup Completed tracked');

          softAssert.throwIfErrors();
        }
      );
    });

    it('should skip backup check and track skip events', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: false,
          testSpecificMock,
          launchArgs: {
            sendMetaMetricsinE2E: true,
          },
        },
        async ({ mockServer }) => {
          await Assertions.checkIfVisible(ProtectYourWalletView.container);
          await ProtectYourWalletView.tapOnRemindMeLaterButton();
          await SkipAccountSecurityModal.tapIUnderstandCheckBox();
          await SkipAccountSecurityModal.tapSkipButton();

          const events = await getEventsPayloads(mockServer, [
            EVENT_NAMES.WALLET_SECURITY_SKIP_INITIATED,
            EVENT_NAMES.WALLET_SECURITY_SKIP_CONFIRMED,
          ]);
          const softAssert = new SoftAssert();
          softAssert.checkAndCollect(async () => {
            await Assertions.checkIfValueIsPresent(findEvent(events, EVENT_NAMES.WALLET_SECURITY_SKIP_INITIATED));
          }, 'Wallet Security Skip Initiated tracked');

          softAssert.checkAndCollect(async () => {
            await Assertions.checkIfValueIsPresent(findEvent(events, EVENT_NAMES.WALLET_SECURITY_SKIP_CONFIRMED));
          }, 'Wallet Security Skip Confirmed tracked');

          softAssert.throwIfErrors();
        }
      );
    });

    it('should opt-in to MetaMetrics and track preference event', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: false,
          testSpecificMock,
          launchArgs: {
            sendMetaMetricsinE2E: true,
          },
        },
        async ({ mockServer }) => {
          await Assertions.checkIfVisible(MetaMetricsOptIn.container);
          await MetaMetricsOptIn.tapAgreeButton();

          const events = await getEventsPayloads(mockServer, [
            EVENT_NAMES.ANALYTICS_PREFERENCE_SELECTED,
          ]);
          const softAssert = new SoftAssert();
          softAssert.checkAndCollect(async () => {
            const e = findEvent(events, EVENT_NAMES.ANALYTICS_PREFERENCE_SELECTED);
            await Assertions.checkIfValueIsPresent(e);
            if (e) {
              await Assertions.checkIfObjectContains(e.properties, {
                analytics_preference: true,
              });
            }
          }, 'Analytics Preference Selected (opt-in) tracked');

          softAssert.throwIfErrors();
        }
      );
    });

    it('should finish onboarding', async () => {
      await OnboardingSuccessView.tapDone();
    });

    it('should dismiss the marketing consent and track analytics', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: false,
          testSpecificMock,
          launchArgs: {
            sendMetaMetricsinE2E: true,
          },
        },
        async ({ mockServer }) => {
          await TestHelpers.delay(1000);
          const softAssert = new SoftAssert();

          try {
            await Assertions.checkIfVisible(ExperienceEnhancerBottomSheet.container);
            await ExperienceEnhancerBottomSheet.tapIAgree();

            const events = await getEventsPayloads(mockServer, [
              EVENT_NAMES.ANALYTICS_PREFERENCE_SELECTED,
            ]);
            softAssert.checkAndCollect(async () => {
              const e = findEvent(events, EVENT_NAMES.ANALYTICS_PREFERENCE_SELECTED);
              await Assertions.checkIfValueIsPresent(e);
              if (e) {
                await Assertions.checkIfObjectContains(e.properties, {
                  has_marketing_consent: true,
                  updated_after_onboarding: true,
                  location: 'marketing_consent_modal',
                });
              }
            }, 'Marketing consent tracked properly');

          } catch {
            console.log('Marketing consent sheet not shown.');
            const events = await getEventsPayloads(mockServer, [
              EVENT_NAMES.ANALYTICS_PREFERENCE_SELECTED,
            ]);
            softAssert.checkAndCollect(async () => {
              await Assertions.checkIfArrayHasLength(events, 0);
            }, 'No marketing consent event should exist if not shown');
          }

          softAssert.throwIfErrors();
        }
      );
    });

    it('should dismiss protect your wallet modal and track reminder dismissed', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: false,
          testSpecificMock,
          launchArgs: {
            sendMetaMetricsinE2E: true,
          },
        },
        async ({ mockServer }) => {
          await Assertions.checkIfVisible(ProtectYourWalletModal.collapseWalletModal);
          await TestHelpers.delay(1000);
          await ProtectYourWalletModal.tapRemindMeLaterButton();
          await SkipAccountSecurityModal.tapIUnderstandCheckBox();
          await SkipAccountSecurityModal.tapSkipButton();
          await Assertions.checkIfVisible(WalletView.container);

          const events = await getEventsPayloads(mockServer, [
            EVENT_NAMES.WALLET_SECURITY_REMINDER_DISMISSED,
          ]);
          const softAssert = new SoftAssert();
          softAssert.checkAndCollect(async () => {
            await Assertions.checkIfValueIsPresent(findEvent(events, EVENT_NAMES.WALLET_SECURITY_REMINDER_DISMISSED));
          }, 'Wallet Security Reminder Dismissed tracked');

          softAssert.throwIfErrors();
        }
      );
    });

    it('should check that metametrics is enabled in settings', async () => {
      await TabBarComponent.tapSettings();
      await SettingsView.tapSecurityAndPrivacy();
      await SecurityAndPrivacy.scrollToMetaMetrics();
      await TestHelpers.delay(2000);
      await Assertions.checkIfToggleIsOn(SecurityAndPrivacy.metaMetricsToggle);
    });

    it('should disable metametrics and track preference change', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: false,
          testSpecificMock,
          launchArgs: {
            sendMetaMetricsinE2E: true,
          },
        },
        async ({ mockServer }) => {
          await SecurityAndPrivacy.tapMetaMetricsToggle();
          await TestHelpers.delay(1500);
          await CommonView.tapOkAlert();
          await Assertions.checkIfToggleIsOff(SecurityAndPrivacy.metaMetricsToggle);

          const events = await getEventsPayloads(mockServer, [
            EVENT_NAMES.ANALYTICS_PREFERENCE_SELECTED,
          ]);
          const softAssert = new SoftAssert();
          softAssert.checkAndCollect(async () => {
            const e = findEvent(events, EVENT_NAMES.ANALYTICS_PREFERENCE_SELECTED);
            await Assertions.checkIfValueIsPresent(e);
            if (e) {
              await Assertions.checkIfObjectContains(e.properties, {
                analytics_preference: false,
              });
            }
          }, 'Analytics Preference Selected (opt-out) tracked');

          softAssert.throwIfErrors();
        }
      );
    });

    it('should relaunch and log in, verifying no events with metametrics disabled', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: false,
          testSpecificMock,
          launchArgs: {
            sendMetaMetricsinE2E: true,
          },
        },
        async ({ mockServer }) => {
          await device.terminateApp();
          await TestHelpers.delay(2000);
          await device.launchApp({ newInstance: true });
          await TestHelpers.delay(3000);

          await Assertions.checkIfVisible(LoginView.container);
          await LoginView.enterPassword(PASSWORD);
          await Assertions.checkIfVisible(WalletView.container);

          const events = await getEventsPayloads(mockServer, [
            EVENT_NAMES.ANALYTICS_PREFERENCE_SELECTED,
          ]);
          await Assertions.checkIfArrayHasLength(events, 0);
        }
      );
    });

    it('should verify metametrics is turned off', async () => {
      await TabBarComponent.tapSettings();
      await SettingsView.tapSecurityAndPrivacy();
      await SecurityAndPrivacy.scrollToMetaMetrics();
      await Assertions.checkIfToggleIsOff(SecurityAndPrivacy.metaMetricsToggle);
    });
  }
);
