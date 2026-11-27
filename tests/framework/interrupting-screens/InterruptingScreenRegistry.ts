import { ExperienceEnhancerBottomSheetSelectorsIDs } from '../../../app/components/Views/ExperienceEnhancerModal/ExperienceEnhancerModal.testIds';
import { ExistingUserSheetSelectorsIDs } from '../../../app/components/Views/Notifications/PushNotificationOnboarding/ExistingUserSheet/ExistingUserSheet.testIds';
import { NewUserSheetSelectorsIDs } from '../../../app/components/Views/Notifications/PushNotificationOnboarding/NewUserSheet/NewUserSheet.testIds';
import { PerpsGTMModalSelectorsIDs } from '../../../app/components/UI/Perps/Perps.testIds';
import { WhatsNewModalSelectorsIDs } from '../../../app/components/UI/WhatsNewModal/WhatsNewModal.testIds';
import { WalletHomeOnboardingStepsSelectors } from '../../../app/components/UI/WalletHomeOnboardingSteps/WalletHomeOnboardingSteps.testIds';
import { ProtectWalletModalSelectorsIDs } from '../../../app/components/UI/ProtectYourWalletModal/ProtectWalletModal.testIds';

/** Locator used by the registry. Only stable identifiers or exact visible text. */
export type InterruptingScreenLocator =
  | { strategy: 'testID'; value: string }
  | { strategy: 'text'; value: string };

export interface InterruptingScreenDefinition {
  /** Stable name used in logs, attachments and phase timings. */
  name: string;
  /** The screen is considered present when ANY of these is in the page source. */
  detect: InterruptingScreenLocator[];
  /**
   * Non-consenting controls ("No thanks", "Not now", close), tried in order.
   * Never list accept / confirm / enable / buy-type controls here.
   */
  dismiss: InterruptingScreenLocator[];
}

const testID = (value: string): InterruptingScreenLocator => ({
  strategy: 'testID',
  value,
});
const text = (value: string): InterruptingScreenLocator => ({
  strategy: 'text',
  value,
});

/**
 * Known screens that can slide over a performance flow without the test
 * asking for them. Each entry is dismissed with its non-consenting option.
 *
 * To add a screen: reuse the component's `*.testIds.ts` constants, put the
 * sheet container / title in `detect`, and the "No thanks" / "Not now" /
 * close control in `dismiss`. See tests/performance/README.md.
 */
export const INTERRUPTING_SCREEN_REGISTRY: readonly InterruptingScreenDefinition[] =
  [
    {
      name: 'experience-enhancer-marketing-consent',
      detect: [
        testID(ExperienceEnhancerBottomSheetSelectorsIDs.BOTTOM_SHEET),
        testID(ExperienceEnhancerBottomSheetSelectorsIDs.TITLE),
        testID(ExperienceEnhancerBottomSheetSelectorsIDs.CANCEL_BUTTON),
      ],
      dismiss: [
        testID(ExperienceEnhancerBottomSheetSelectorsIDs.CANCEL_BUTTON),
        text('No thanks'),
      ],
    },
    {
      name: 'push-notification-existing-user-sheet',
      detect: [
        testID(ExistingUserSheetSelectorsIDs.CONTAINER),
        testID(ExistingUserSheetSelectorsIDs.TITLE),
      ],
      dismiss: [
        testID(ExistingUserSheetSelectorsIDs.BUTTON_NOT_NOW),
        text('Not now'),
      ],
    },
    {
      name: 'push-notification-new-user-sheet',
      detect: [
        testID(NewUserSheetSelectorsIDs.CONTAINER),
        testID(NewUserSheetSelectorsIDs.TITLE),
      ],
      dismiss: [
        testID(NewUserSheetSelectorsIDs.BUTTON_NOT_NOW),
        text('Not now'),
      ],
    },
    {
      name: 'perps-gtm-modal',
      detect: [testID(PerpsGTMModalSelectorsIDs.PERPS_GTM_MODAL)],
      dismiss: [testID(PerpsGTMModalSelectorsIDs.PERPS_NOT_NOW_BUTTON)],
    },
    {
      name: 'predict-gtm-modal',
      detect: [text('PREDICT AND WIN')],
      dismiss: [text('Not now')],
    },
    {
      name: 'whats-new-modal',
      detect: [testID(WhatsNewModalSelectorsIDs.CONTAINER)],
      dismiss: [testID(WhatsNewModalSelectorsIDs.CLOSE_BUTTON)],
    },
    {
      name: 'protect-your-wallet-modal',
      detect: [testID(ProtectWalletModalSelectorsIDs.CONTAINER)],
      dismiss: [testID(ProtectWalletModalSelectorsIDs.REMIND_ME_LATER_BUTTON)],
    },
    {
      // "Get started on MetaMask" checklist card on wallet home. Unlike the
      // sheets above it does not cover the app, but its steps push the content
      // the test wants out of view; Skip moves past a step without acting on it.
      name: 'wallet-home-onboarding-steps',
      detect: [
        testID(WalletHomeOnboardingStepsSelectors.CONTAINER),
        testID(WalletHomeOnboardingStepsSelectors.SKIP_BUTTON),
      ],
      dismiss: [testID(WalletHomeOnboardingStepsSelectors.SKIP_BUTTON)],
    },
  ];

function escapeXmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * True when the locator appears as a full attribute value in an Appium page
 * source (Android `resource-id` / `text` / `content-desc`, iOS `name` /
 * `label` / `value`). Matching the quoted value avoids prefix collisions such
 * as `perps-gtm-modal` vs `perps-gtm-modal-title`.
 */
export function pageSourceContainsLocator(
  pageSource: string,
  locator: InterruptingScreenLocator,
): boolean {
  return pageSource.includes(`="${escapeXmlAttribute(locator.value)}"`);
}

/** Registry entries whose detect locators are present in the page source. */
export function findInterruptingScreensInPageSource(
  pageSource: string,
  registry: readonly InterruptingScreenDefinition[] = INTERRUPTING_SCREEN_REGISTRY,
): InterruptingScreenDefinition[] {
  return registry.filter((screen) =>
    screen.detect.some((locator) =>
      pageSourceContainsLocator(pageSource, locator),
    ),
  );
}
