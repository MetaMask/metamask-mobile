import type { ImageSourcePropType } from 'react-native';
import type { VbaHomeCard } from '../../../Ramp/Views/VirtualBankAccount/hooks/useVbaHomeCard';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
} from '../../constants/moneyEvents';
import moneyVbaIdentityArt from '../../../../../images/money-vba-identity-art.png';
import moneyVbaAccountReadyArt from '../../../../../images/money-vba-account-ready-art.png';
import moneyVbaKycDecisionArt from '../../../../../images/money-vba-kyc-decision-art.png';
import moneyVbaVerifyingIdentityAnimation from '../../../../../animations/money_vba_verifying_identity.riv';

/** A VBA home card status that renders a card (`VbaHomeCard` minus `none`). */
export type MoneyVbaHomeCardVariant = Exclude<VbaHomeCard['type'], 'none'>;

/** Hero illustration, sized to its Figma frame. */
export interface MoneyVbaHomeCardHeroArt {
  source: ImageSourcePropType;
  width: number;
  height: number;
}

/**
 * Rive hero animation. Runtime-facing names MUST match the names authored in
 * the `.riv` file; a designer-side rename only surfaces through `onError`.
 */
export interface MoneyVbaHomeCardHeroAnimation {
  /** Statically imported `.riv` asset. */
  source: number | { uri: string };
  artboardName: string;
  stateMachineName: string;
}

/**
 * The card's primary button, labelled `${i18nPrefix}.cta`. Either it opens VBA
 * onboarding, or it is a disabled status label (KYC_PENDING) that uses the
 * design-system disabled styling and never fires.
 */
type MoneyVbaHomeCardCta =
  | {
      isDisabled?: false;
      /** `button_intent` on the CTA-tap event. */
      buttonIntent: MONEY_BUTTON_INTENTS;
      /** Tailwind classes for the button background. */
      className: string;
      /** Tailwind classes for the button text. */
      textClassName: string;
    }
  | { isDisabled: true };

/** Static, per-variant differences rendered by `MoneyVbaHomeCard`. */
interface MoneyVbaHomeCardConfig {
  /** `component_name` on the card-shown and CTA-tap events. */
  componentName: COMPONENT_NAMES;
  /** Telemetry source forwarded to the onboarding loading screen. */
  source: string;
  /** Card reads `${i18nPrefix}.title`, `.description` and `.cta`. */
  i18nPrefix: string;
  /** Hero illustration shown above the copy. */
  heroArt: MoneyVbaHomeCardHeroArt;
  /**
   * Optional Rive animation played in place of `heroArt`. `heroArt` stays the
   * fallback while it loads, when Reduce Motion is on, and on Rive errors.
   */
  heroAnimation?: MoneyVbaHomeCardHeroAnimation;
  /** Primary button; see `MoneyVbaHomeCardCta`. */
  cta: MoneyVbaHomeCardCta;
  /**
   * Shows a Dismiss button beside the CTA. Dismissing hides the card until the
   * home screen remounts.
   */
  isDismissible?: boolean;
}

const IDENTITY_HERO_ART: MoneyVbaHomeCardHeroArt = {
  source: moneyVbaIdentityArt,
  width: 106.5,
  height: 88,
};

/**
 * Verifying-identity animation for the KYC_PENDING card. Plays `In`, then one
 * `Loop` scan (oneShot in the file), and holds its eased end pose.
 */
const VERIFYING_IDENTITY_HERO_ANIMATION: MoneyVbaHomeCardHeroAnimation = {
  source: moneyVbaVerifyingIdentityAnimation,
  artboardName: 'Verify Identity',
  stateMachineName: 'Verify Identity',
};

/**
 * One entry per VBA home card variant. Keyed by `VbaHomeCard['type']`, so the
 * compiler fails the build when a variant is added to `useVbaHomeCard`
 * without a card spec here.
 */
export const MONEY_VBA_HOME_CARD_CONFIG: Record<
  MoneyVbaHomeCardVariant,
  MoneyVbaHomeCardConfig
> = {
  get_started: {
    componentName: COMPONENT_NAMES.MONEY_VBA_GET_STARTED_CARD,
    source: 'vba-home-card-get-started',
    i18nPrefix: 'money.vba_home_card.get_started',
    heroArt: IDENTITY_HERO_ART,
    cta: {
      buttonIntent: MONEY_BUTTON_INTENTS.GET_STARTED,
      className: 'bg-icon-default',
      textClassName: 'text-primary-inverse',
    },
  },
  account_is_ready: {
    componentName: COMPONENT_NAMES.MONEY_VBA_ACCOUNT_READY_CARD,
    source: 'vba-home-card-account-is-ready',
    i18nPrefix: 'money.vba_home_card.account_is_ready',
    heroArt: {
      source: moneyVbaAccountReadyArt,
      width: 98,
      height: 74.5,
    },
    cta: {
      buttonIntent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING,
      className: 'bg-icon-default',
      textClassName: 'text-primary-inverse',
    },
  },
  kyc_pending: {
    componentName: COMPONENT_NAMES.MONEY_VBA_KYC_PENDING_CARD,
    source: 'vba-home-card-kyc-pending',
    i18nPrefix: 'money.vba_home_card.kyc_pending',
    heroArt: IDENTITY_HERO_ART,
    heroAnimation: VERIFYING_IDENTITY_HERO_ANIMATION,
    // Status only: the user waits on the KYC review, so nothing to press.
    cta: { isDisabled: true },
  },
  finish_verification: {
    componentName: COMPONENT_NAMES.MONEY_VBA_FINISH_VERIFICATION_CARD,
    source: 'vba-home-card-finish-verification',
    i18nPrefix: 'money.vba_home_card.finish_verification',
    heroArt: IDENTITY_HERO_ART,
    cta: {
      buttonIntent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING,
      className: 'bg-muted',
      textClassName: 'text-default',
    },
  },
  kyc_decision: {
    componentName: COMPONENT_NAMES.MONEY_VBA_KYC_DECISION_CARD,
    source: 'vba-home-card-kyc-decision',
    i18nPrefix: 'money.vba_home_card.kyc_decision',
    heroArt: {
      source: moneyVbaKycDecisionArt,
      width: 106.5,
      height: 88,
    },
    isDismissible: true,
    cta: {
      buttonIntent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING,
      className: 'bg-muted',
      textClassName: 'text-default',
    },
  },
};
