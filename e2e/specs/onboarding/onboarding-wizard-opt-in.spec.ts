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
// import CommonView from '../../pages/CommonView';
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
import { MockttpServer } from 'mockttp';

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
        },
        async ({ mockServer }: { mockServer: MockttpServer }) => {
          await OnboardingCarouselView.tapOnGetStartedButton();
          await acceptTermOfUse();
          await OnboardingView.tapCreateWallet();

          const events = await getEventsPayloads(mockServer, [
            EVENT_NAMES.WELCOME_MESSAGE_VIEWED,
            EVENT_NAMES.ONBOARDING_STARTED,
          ]);
          const softAssert = new SoftAssert();
          await softAssert.checkAndCollect(async () => {
            await Assertions.checkIfValueIsDefined(findEvent(events, EVENT_NAMES.WELCOME_MESSAGE_VIEWED));
          }, 'Welcome Message Viewed tracked');

          await softAssert.checkAndCollect(async () => {
            await Assertions.checkIfValueIsDefined(findEvent(events, EVENT_NAMES.ONBOARDING_STARTED));
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
        },
        async ({ mockServer }: { mockServer: MockttpServer }) => {
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
          await softAssert.checkAndCollect(async () => {
            await Assertions.checkIfValueIsDefined(findEvent(events, EVENT_NAMES.WALLET_CREATION_ATTEMPTED));
          }, 'Wallet Creation Attempted tracked');

          await softAssert.checkAndCollect(async () => {
            await Assertions.checkIfValueIsDefined(findEvent(events, EVENT_NAMES.WALLET_CREATED));
          }, 'Wallet Created tracked');

          await softAssert.checkAndCollect(async () => {
            await Assertions.checkIfValueIsDefined(findEvent(events, EVENT_NAMES.WALLET_PASSWORD_CREATED));
          }, 'Wallet Password Created tracked');

          await softAssert.checkAndCollect(async () => {
            await Assertions.checkIfValueIsDefined(findEvent(events, EVENT_NAMES.WALLET_SETUP_COMPLETED));
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
        },
        async ({ mockServer }: { mockServer: MockttpServer }) => {
          await Assertions.checkIfVisible(ProtectYourWalletView.container);
          await ProtectYourWalletView.tapOnRemindMeLaterButton();
          await SkipAccountSecurityModal.tapIUnderstandCheckBox();
          await SkipAccountSecurityModal.tapSkipButton();

          const events = await getEventsPayloads(mockServer, [
            EVENT_NAMES.WALLET_SECURITY_SKIP_INITIATED,
            EVENT_NAMES.WALLET_SECURITY_SKIP_CONFIRMED,
          ]);
          const softAssert = new SoftAssert();
          await softAssert.checkAndCollect(async () => {
            await Assertions.checkIfValueIsDefined(findEvent(events, EVENT_NAMES.WALLET_SECURITY_SKIP_INITIATED));
          }, 'Wallet Security Skip Initiated tracked');

          await softAssert.checkAndCollect(async () => {
            await Assertions.checkIfValueIsDefined(findEvent(events, EVENT_NAMES.WALLET_SECURITY_SKIP_CONFIRMED));
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
        },
        async ({ mockServer }: { mockServer: MockttpServer }) => {
          await Assertions.checkIfVisible(MetaMetricsOptIn.container);
          await MetaMetricsOptIn.tapAgreeButton();

          const events = await getEventsPayloads(mockServer, [
            EVENT_NAMES.ANALYTICS_PREFERENCE_SELECTED,
          ]);
          const softAssert = new SoftAssert();
          await softAssert.checkAndCollect(async () => {
            const e = findEvent(events, EVENT_NAMES.ANALYTICS_PREFERENCE_SELECTED);
            await Assertions.checkIfValueIsDefined(e);
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

    // Helper function to ensure we reach the wallet screen
    const ensureWalletScreen = async () => {
      // try {
      //   // First try to check if we're already on wallet screen
      //   // Even if the above fails, this likely passes because it is rendered anyhow regardless of having modals in front of it
      //   // we should instead get a more robust way to check if we're on the wallet screen and no modals are in front of it
      //   await Assertions.checkIfVisible(WalletView.container);
      //   console.warn('wallet screen was found');
      //   return;
      // } catch (error) {
      //   // Not on wallet screen, checking for intermediate screens
      // }

      // Check for marketing consent modal
      try {
        await Assertions.checkIfVisible(ExperienceEnhancerBottomSheet.container);
        console.warn('marketing consent modal was found');
        await ExperienceEnhancerBottomSheet.tapIAgree();
        // Dismissed marketing consent modal
      } catch (error) {
        // No marketing consent modal found
      }

      // Check for protect your wallet modal
      try {
        await Assertions.checkIfVisible(ProtectYourWalletModal.collapseWalletModal);
        console.warn('protect your wallet modal was found');
        await TestHelpers.delay(1000);
        await ProtectYourWalletModal.tapRemindMeLaterButton();
        await SkipAccountSecurityModal.tapIUnderstandCheckBox();
        await SkipAccountSecurityModal.tapSkipButton();
        // Dismissed protect your wallet modal
      } catch (error) {
        // No protect your wallet modal found
      }

      // Now check if we're on wallet screen
      // Even if the above fails, this likely passes because it is rendered anyhow regardless of having modals in front of it
      await Assertions.checkIfVisible(WalletView.container);
    };

    it('should dismiss the marketing consent and track analytics', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: false,
          testSpecificMock,
        },
        async ({ mockServer }: { mockServer: MockttpServer }) => {
          await TestHelpers.delay(1000);
          const softAssert = new SoftAssert();

          try {
            await Assertions.checkIfVisible(ExperienceEnhancerBottomSheet.container);
            await ExperienceEnhancerBottomSheet.tapIAgree();

            const events = await getEventsPayloads(mockServer, [
              EVENT_NAMES.ANALYTICS_PREFERENCE_SELECTED,
            ]);
            await softAssert.checkAndCollect(async () => {
              const e = findEvent(events, EVENT_NAMES.ANALYTICS_PREFERENCE_SELECTED);
              await Assertions.checkIfValueIsDefined(e);
              if (e) {
                await Assertions.checkIfObjectContains(e.properties, {
                  has_marketing_consent: true,
                  updated_after_onboarding: true,
                  location: 'marketing_consent_modal',
                });
              }
            }, 'Marketing consent tracked properly');

          } catch {
            const events = await getEventsPayloads(mockServer, [
              EVENT_NAMES.ANALYTICS_PREFERENCE_SELECTED,
            ]);
            await softAssert.checkAndCollect(async () => {
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
        },
        async ({ mockServer }: { mockServer: MockttpServer }) => {
          const softAssert = new SoftAssert();

          try {
            await Assertions.checkIfVisible(ProtectYourWalletModal.collapseWalletModal);
            await TestHelpers.delay(1000);
            await ProtectYourWalletModal.tapRemindMeLaterButton();
            await SkipAccountSecurityModal.tapIUnderstandCheckBox();
            await SkipAccountSecurityModal.tapSkipButton();
            await Assertions.checkIfVisible(WalletView.container);

            const events = await getEventsPayloads(mockServer, [
              EVENT_NAMES.WALLET_SECURITY_REMINDER_DISMISSED,
            ]);
            await softAssert.checkAndCollect(async () => {
              await Assertions.checkIfValueIsDefined(findEvent(events, EVENT_NAMES.WALLET_SECURITY_REMINDER_DISMISSED));
            }, 'Wallet Security Reminder Dismissed tracked');

          } catch (error) {
            // Ensure we're on the wallet screen even if modal didn't appear
            await Assertions.checkIfVisible(WalletView.container);

            const events = await getEventsPayloads(mockServer, [
              EVENT_NAMES.WALLET_SECURITY_REMINDER_DISMISSED,
            ]);
            await softAssert.checkAndCollect(async () => {
              await Assertions.checkIfArrayHasLength(events, 0);
            }, 'No wallet security reminder event should exist if modal not shown');
          }

          softAssert.throwIfErrors();
        }
      );
    });

    it('should check that metametrics is enabled in settings', async () => {
      await TestHelpers.delay(2000); // Wait for UI to stabilize
      await ensureWalletScreen(); // Use helper function to ensure we're on wallet screen
      await TabBarComponent.tapSettings();
      await TestHelpers.delay(2000); // Wait for settings to load
      await SettingsView.tapSecurityAndPrivacy();
      await SecurityAndPrivacy.scrollToMetaMetrics();
      await TestHelpers.delay(2000);
      await Assertions.checkIfToggleIsOn(SecurityAndPrivacy.metaMetricsToggle as Promise<Detox.IndexableNativeElement>);
    });

    it('should disable metametrics and track preference change', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: false,
          testSpecificMock,
        },
        async ({ mockServer }: { mockServer: MockttpServer }) => {
          await SecurityAndPrivacy.tapMetaMetricsToggle();
          await TestHelpers.delay(1500);
          // we may have a race condition here
          // We can stop any actions and still check for the events afterwards
          // await CommonView.tapOkAlert();
          // await Assertions.checkIfToggleIsOff(SecurityAndPrivacy.metaMetricsToggle);

          const events = await getEventsPayloads(mockServer, [
            EVENT_NAMES.ANALYTICS_PREFERENCE_SELECTED,
          ]);
          const softAssert = new SoftAssert();
          await softAssert.checkAndCollect(async () => {
            const e = findEvent(events, EVENT_NAMES.ANALYTICS_PREFERENCE_SELECTED);
            await Assertions.checkIfValueIsDefined(e);
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
        },
        async ({ mockServer }: { mockServer: MockttpServer }) => {
          await LoginView.enterPassword(PASSWORD);
          await Assertions.checkIfVisible(WalletView.container);
          await TestHelpers.delay(2000);
          // We should get the events without any event so that
          // we verify that the list is empty
          const events = await getEventsPayloads(mockServer, [
            EVENT_NAMES.ANALYTICS_PREFERENCE_SELECTED,
          ]);

          await Assertions.checkIfArrayHasLength(events, 0);
        }
      );
    });

    it('should verify metametrics is turned off', async () => {

      // We don't need synchronization here as we just need to navigate to the toggle
      await device.disableSynchronization();
      await TestHelpers.delay(500); // Wait for UI to stabilize
      await ensureWalletScreen(); // Use helper function to ensure we're on wallet screen
      await TabBarComponent.tapSettings();
      await TestHelpers.delay(500); // Wait for settings to load
      await SettingsView.tapSecurityAndPrivacy(); // ANIMATION HERE, we need to be careful with this

      // ignore
      // let isMetaMetricsVisible = false;
      // while (!isMetaMetricsVisible) {
      //   try {
      //     await Assertions.checkIfVisible(SecurityAndPrivacy.metaMetricsToggle);
      //     isMetaMetricsVisible = true;
      //   } catch (error) {
      //     console.warn('meta metrics toggle not found, trying again in 100ms');
      //     // No meta metrics toggle found
      //     await TestHelpers.delay(100); // Wait for UI to stabilize
      //   }
      // }

      // Theres an animation here that we need to wait for
      // we need to be careful with this and should find a better way to handle this
      await TestHelpers.delay(500);

      await SecurityAndPrivacy.scrollToMetaMetrics();
      await Assertions.checkIfToggleIsOff(SecurityAndPrivacy.metaMetricsToggle as Promise<Detox.IndexableNativeElement>);
    });
  }
);
