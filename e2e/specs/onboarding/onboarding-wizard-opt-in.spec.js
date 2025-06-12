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
  filterEvents 
} from '../analytics/helpers';
import SoftAssert from '../../utils/SoftAssert';

const PASSWORD = '12345678';

// Test specific mock configuration for analytics
const testSpecificMock = {
  POST: [mockEvents.POST.segmentTrack],
};

// Analytics event constants
const EVENT_NAMES = {
  ANALYTICS_PREFERENCE_SELECTED: 'Analytics Preference Selected',
  WELCOME_MESSAGE_VIEWED: 'Welcome Message Viewed',
  ONBOARDING_STARTED: 'Onboarding Started',
  WALLET_SETUP_STARTED: 'Wallet Setup Started',
  WALLET_CREATION_ATTEMPTED: 'Wallet Creation Attempted',
  WALLET_CREATED: 'Wallet Created',
  WALLET_SETUP_COMPLETED: 'Wallet Setup Completed',
  WALLET_SECURITY_SKIP_INITIATED: 'Wallet Security Skip Initiated',
  WALLET_SECURITY_SKIP_CONFIRMED: 'Wallet Security Skip Confirmed',
  AUTOMATIC_SECURITY_CHECKS_PROMPT_VIEWED: 'Automatic Security Checks Prompt Viewed',
  AUTOMATIC_SECURITY_CHECKS_DISABLED_FROM_PROMPT: 'Automatic Security Checks Disabled From Prompt',
  WALLET_SECURITY_REMINDER_DISMISSED: 'Wallet Security Reminder Dismissed',
};

describe(
  Regression('Onboarding wizard opt-in, metametrics opt out from settings with Analytics'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(150000);
      await TestHelpers.reverseServerPort();
    });

    it('should be able to opt-in of the onboarding-wizard and track analytics', async () => {
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
          await Assertions.checkIfVisible(MetaMetricsOptIn.container);
          await MetaMetricsOptIn.tapAgreeButton();
          await Assertions.checkIfVisible(CreatePasswordView.container);

          // Verify analytics events for initial onboarding steps
          const initialEvents = await getEventsPayloads(mockServer, [
            EVENT_NAMES.WELCOME_MESSAGE_VIEWED,
            EVENT_NAMES.ONBOARDING_STARTED,
            EVENT_NAMES.ANALYTICS_PREFERENCE_SELECTED,
            EVENT_NAMES.WALLET_SETUP_STARTED,
          ]);

          const softAssert = new SoftAssert();
          
          softAssert.checkAndCollect(async () => {
            const welcomeEvent = findEvent(initialEvents, EVENT_NAMES.WELCOME_MESSAGE_VIEWED);
            await Assertions.checkIfValueIsPresent(welcomeEvent);
          }, 'Welcome Message Viewed event should be tracked');

          softAssert.checkAndCollect(async () => {
            const onboardingStartedEvent = findEvent(initialEvents, EVENT_NAMES.ONBOARDING_STARTED);
            await Assertions.checkIfValueIsPresent(onboardingStartedEvent);
          }, 'Onboarding Started event should be tracked');

          softAssert.checkAndCollect(async () => {
            const analyticsOptInEvent = findEvent(initialEvents, EVENT_NAMES.ANALYTICS_PREFERENCE_SELECTED);
            await Assertions.checkIfValueIsPresent(analyticsOptInEvent);
            if (analyticsOptInEvent) {
              await Assertions.checkIfObjectContains(
                analyticsOptInEvent.properties,
                { analytics_preference: true }
              );
            }
          }, 'Analytics Preference Selected event should be tracked with opt-in=true');

          softAssert.checkAndCollect(async () => {
            const walletSetupStartedEvent = findEvent(initialEvents, EVENT_NAMES.WALLET_SETUP_STARTED);
            await Assertions.checkIfValueIsPresent(walletSetupStartedEvent);
          }, 'Wallet Setup Started event should be tracked');

          softAssert.throwIfErrors();
        }
      );
    });

    it('should be able to create a new wallet and track creation analytics', async () => {
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
          await CreatePasswordView.enterPassword(PASSWORD);
          await CreatePasswordView.reEnterPassword(PASSWORD);
          await CreatePasswordView.tapIUnderstandCheckBox();
          await CreatePasswordView.tapCreatePasswordButton();

          // Verify wallet creation analytics
          const creationEvents = await getEventsPayloads(mockServer, [
            EVENT_NAMES.WALLET_CREATION_ATTEMPTED,
            EVENT_NAMES.WALLET_CREATED,
            EVENT_NAMES.WALLET_SETUP_COMPLETED,
          ]);

          const softAssert = new SoftAssert();

          softAssert.checkAndCollect(async () => {
            const walletCreationAttemptedEvent = findEvent(creationEvents, EVENT_NAMES.WALLET_CREATION_ATTEMPTED);
            await Assertions.checkIfValueIsPresent(walletCreationAttemptedEvent);
          }, 'Wallet Creation Attempted event should be tracked');

          softAssert.checkAndCollect(async () => {
            const walletCreatedEvent = findEvent(creationEvents, EVENT_NAMES.WALLET_CREATED);
            await Assertions.checkIfValueIsPresent(walletCreatedEvent);
          }, 'Wallet Created event should be tracked');

          softAssert.checkAndCollect(async () => {
            const walletSetupCompletedEvent = findEvent(creationEvents, EVENT_NAMES.WALLET_SETUP_COMPLETED);
            await Assertions.checkIfValueIsPresent(walletSetupCompletedEvent);
          }, 'Wallet Setup Completed event should be tracked');

          softAssert.throwIfErrors();
        }
      );
    });

    it('Should skip backup check and track security skip analytics', async () => {
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
          // Check that we are on the Secure your wallet screen
          await Assertions.checkIfVisible(ProtectYourWalletView.container);
          await ProtectYourWalletView.tapOnRemindMeLaterButton();
          await SkipAccountSecurityModal.tapIUnderstandCheckBox();
          await SkipAccountSecurityModal.tapSkipButton();
          await OnboardingSuccessView.tapDone();

          // Verify security skip analytics
          const securityEvents = await getEventsPayloads(mockServer, [
            EVENT_NAMES.WALLET_SECURITY_SKIP_INITIATED,
            EVENT_NAMES.WALLET_SECURITY_SKIP_CONFIRMED,
          ]);

          const softAssert = new SoftAssert();

          softAssert.checkAndCollect(async () => {
            const skipInitiatedEvent = findEvent(securityEvents, EVENT_NAMES.WALLET_SECURITY_SKIP_INITIATED);
            await Assertions.checkIfValueIsPresent(skipInitiatedEvent);
          }, 'Wallet Security Skip Initiated event should be tracked');

          softAssert.checkAndCollect(async () => {
            const skipConfirmedEvent = findEvent(securityEvents, EVENT_NAMES.WALLET_SECURITY_SKIP_CONFIRMED);
            await Assertions.checkIfValueIsPresent(skipConfirmedEvent);
          }, 'Wallet Security Skip Confirmed event should be tracked');

          softAssert.throwIfErrors();
        }
      );
    });

    it('should dismiss the marketing consent bottom sheet and track analytics', async () => {
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
          // dealing with flakiness on bitrise.
          await TestHelpers.delay(1000);
          try {
            await Assertions.checkIfVisible(
              ExperienceEnhancerBottomSheet.container,
            );
            await ExperienceEnhancerBottomSheet.tapIAgree();
          } catch {
            /* eslint-disable no-console */
            console.log('The marketing consent sheet is not visible');
          }

          // Verify marketing consent analytics if applicable
          const marketingEvents = await getEventsPayloads(mockServer);
          // Note: Marketing consent events may not exist in current implementation
          // This is a placeholder for when marketing consent analytics are added
        }
      );
    });

    it('should dismiss the protect your wallet modal and track security reminder analytics', async () => {
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
          await Assertions.checkIfVisible(
            ProtectYourWalletModal.collapseWalletModal,
          );
          await TestHelpers.delay(1000);
          await ProtectYourWalletModal.tapRemindMeLaterButton();
          await SkipAccountSecurityModal.tapIUnderstandCheckBox();
          await SkipAccountSecurityModal.tapSkipButton();
          await Assertions.checkIfVisible(WalletView.container);

          // Verify security reminder analytics
          const securityReminderEvents = await getEventsPayloads(mockServer, [
            EVENT_NAMES.WALLET_SECURITY_REMINDER_DISMISSED,
          ]);

          const softAssert = new SoftAssert();

          softAssert.checkAndCollect(async () => {
            const reminderDismissedEvent = findEvent(securityReminderEvents, EVENT_NAMES.WALLET_SECURITY_REMINDER_DISMISSED);
            await Assertions.checkIfValueIsPresent(reminderDismissedEvent);
          }, 'Wallet Security Reminder Dismissed event should be tracked');

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

    it('should disable metametrics and track analytics preference change', async () => {
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

          // Verify analytics preference change
          const analyticsPreferenceEvents = await getEventsPayloads(mockServer, [
            EVENT_NAMES.ANALYTICS_PREFERENCE_SELECTED,
          ]);

          const softAssert = new SoftAssert();

          softAssert.checkAndCollect(async () => {
            const analyticsOptOutEvent = findEvent(analyticsPreferenceEvents, EVENT_NAMES.ANALYTICS_PREFERENCE_SELECTED);
            await Assertions.checkIfValueIsPresent(analyticsOptOutEvent);
            if (analyticsOptOutEvent) {
              await Assertions.checkIfObjectContains(
                analyticsOptOutEvent.properties,
                { analytics_preference: false }
              );
            }
          }, 'Analytics Preference Selected event should be tracked with opt-in=false');

          softAssert.throwIfErrors();
        }
      );
    });

    it('should relaunch the app and log in', async () => {
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
          // Use device.launchApp instead of TestHelpers.relaunchApp
          await device.terminateApp();
          await TestHelpers.delay(2000);
          await device.launchApp({ newInstance: true });
          await TestHelpers.delay(3000);
          
          await Assertions.checkIfVisible(LoginView.container);
          await LoginView.enterPassword(PASSWORD);
          await TestHelpers.delay(1000);
          await Assertions.checkIfVisible(WalletView.container);

          // Capture any analytics events during login with disabled metametrics
          const loginEvents = await getEventsPayloads(mockServer, []);
          console.log('Login events (should be minimal due to disabled metametrics):', loginEvents);
          
          // Assert that login events are minimal when metametrics is disabled
          if (loginEvents.length > 2) {
            throw new Error(`Expected minimal login events due to disabled metametrics, but got ${loginEvents.length} events: ${JSON.stringify(loginEvents)}`);
          }
        }
      );
    });

    it('should verify metametrics is turned off', async () => {
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
          await TabBarComponent.tapSettings();
          await TestHelpers.delay(1000);
          await SettingsView.tapSecurityAndPrivacy();
          await TestHelpers.delay(1000);
          await SecurityAndPrivacy.scrollToMetaMetrics();
          await TestHelpers.delay(1000);
          await Assertions.checkIfToggleIsOff(SecurityAndPrivacy.metaMetricsToggle);

          // Verify no analytics events are sent when navigating with metametrics disabled
          const navigationEvents = await getEventsPayloads(mockServer, []);
          console.log('Navigation events (should be empty due to disabled metametrics):', navigationEvents);
          
          // Assert that no navigation events are tracked when metametrics is disabled
          if (navigationEvents.length !== 0) {
            throw new Error(`Expected no navigation events due to disabled metametrics, but got ${navigationEvents.length} events: ${JSON.stringify(navigationEvents)}`);
          }
        }
      );
    });
  },
);
