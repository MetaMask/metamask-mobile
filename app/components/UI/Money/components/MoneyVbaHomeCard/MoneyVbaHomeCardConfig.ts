import type { ImageSourcePropType } from 'react-native';
import { IconName } from '@metamask/design-system-react-native';
import type { VbaHomeCard } from '../../../Ramp/Views/VirtualBankAccount/hooks/useVbaHomeCard';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
} from '../../constants/moneyEvents';
import moneyVbaIdentityArt from '../../../../../images/money-vba-identity-art.png';
import moneyVbaAccountReadyArt from '../../../../../images/money-vba-account-ready-art.png';
import moneyVbaKycDecisionArt from '../../../../../images/money-vba-kyc-decision-art.png';

/** A VBA home card status that renders a card (`VbaHomeCard` minus `none`). */
export type MoneyVbaHomeCardVariant = Exclude<VbaHomeCard['type'], 'none'>;

/** Hero illustration, sized to its Figma frame. */
interface MoneyVbaHomeCardHeroArt {
  source: ImageSourcePropType;
  width: number;
  height: number;
}

/** Static, per-variant differences rendered by `MoneyVbaHomeCard`. */
interface MoneyVbaHomeCardConfig {
  /** `component_name` on the card-shown and CTA-tap events. */
  componentName: COMPONENT_NAMES;
  /** Telemetry source forwarded to the onboarding loading screen. */
  source: string;
  /** Card reads `${i18nPrefix}.title`, `.description` and `.cta`. */
  i18nPrefix: string;
  /** `button_intent` on the CTA-tap event. */
  buttonIntent: MONEY_BUTTON_INTENTS;
  /** Hero illustration shown above the copy. */
  heroArt: MoneyVbaHomeCardHeroArt;
  /** Tailwind classes for the CTA button background. */
  ctaClassName: string;
  /** Tailwind classes for the CTA button text. */
  ctaTextClassName: string;
  /** Optional leading icon on the CTA (e.g. the KYC_PENDING spinner). */
  ctaStartIconName?: IconName;
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
    buttonIntent: MONEY_BUTTON_INTENTS.GET_STARTED,
    heroArt: IDENTITY_HERO_ART,
    ctaClassName: 'bg-icon-default',
    ctaTextClassName: 'text-primary-inverse',
  },
  account_is_ready: {
    componentName: COMPONENT_NAMES.MONEY_VBA_ACCOUNT_READY_CARD,
    source: 'vba-home-card-account-is-ready',
    i18nPrefix: 'money.vba_home_card.account_is_ready',
    buttonIntent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING,
    heroArt: {
      source: moneyVbaAccountReadyArt,
      width: 98,
      height: 74.5,
    },
    ctaClassName: 'bg-icon-default',
    ctaTextClassName: 'text-primary-inverse',
  },
  kyc_pending: {
    componentName: COMPONENT_NAMES.MONEY_VBA_KYC_PENDING_CARD,
    source: 'vba-home-card-kyc-pending',
    i18nPrefix: 'money.vba_home_card.kyc_pending',
    buttonIntent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING,
    heroArt: IDENTITY_HERO_ART,
    ctaClassName: 'bg-muted-pressed',
    ctaTextClassName: 'text-default',
    ctaStartIconName: IconName.Loading,
  },
  finish_verification: {
    componentName: COMPONENT_NAMES.MONEY_VBA_FINISH_VERIFICATION_CARD,
    source: 'vba-home-card-finish-verification',
    i18nPrefix: 'money.vba_home_card.finish_verification',
    buttonIntent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING,
    heroArt: IDENTITY_HERO_ART,
    ctaClassName: 'bg-muted',
    ctaTextClassName: 'text-default',
  },
  kyc_decision: {
    componentName: COMPONENT_NAMES.MONEY_VBA_KYC_DECISION_CARD,
    source: 'vba-home-card-kyc-decision',
    i18nPrefix: 'money.vba_home_card.kyc_decision',
    buttonIntent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING,
    heroArt: {
      source: moneyVbaKycDecisionArt,
      width: 106.5,
      height: 88,
    },
    ctaClassName: 'bg-muted',
    ctaTextClassName: 'text-default',
    isDismissible: true,
  },
};
