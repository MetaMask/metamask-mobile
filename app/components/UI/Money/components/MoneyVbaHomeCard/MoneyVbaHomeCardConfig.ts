import { IconName } from '@metamask/design-system-react-native';
import type { VbaHomeCard } from '../../../Ramp/Views/VirtualBankAccount/hooks/useVbaHomeCard';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
} from '../../constants/moneyEvents';

/** A VBA home card status that renders a card (`VbaHomeCard` minus `none`). */
export type MoneyVbaHomeCardVariant = Exclude<VbaHomeCard['type'], 'none'>;

/** Static, per-variant differences rendered by `MoneyVbaHomeCard`. */
interface MoneyVbaHomeCardConfig {
  /** `component_name` on the card-shown and CTA-tap events. */
  componentName: COMPONENT_NAMES;
  /** Telemetry source passed to `useOpenVbaOnboarding`. */
  source: string;
  /** Card reads `${i18nPrefix}.title`, `.description` and `.cta`. */
  i18nPrefix: string;
  /** `button_intent` on the CTA-tap event. */
  buttonIntent: MONEY_BUTTON_INTENTS;
  /** Tailwind classes for the CTA button background. */
  ctaClassName: string;
  /** Tailwind classes for the CTA button text. */
  ctaTextClassName: string;
  /** Optional leading icon on the CTA (e.g. the KYC_PENDING spinner). */
  ctaStartIconName?: IconName;
}

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
    ctaClassName: 'bg-icon-default',
    ctaTextClassName: 'text-primary-inverse',
  },
  account_is_ready: {
    componentName: COMPONENT_NAMES.MONEY_VBA_ACCOUNT_READY_CARD,
    source: 'vba-home-card-account-is-ready',
    i18nPrefix: 'money.vba_home_card.account_is_ready',
    buttonIntent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING,
    ctaClassName: 'bg-icon-default',
    ctaTextClassName: 'text-primary-inverse',
  },
  kyc_pending: {
    componentName: COMPONENT_NAMES.MONEY_VBA_KYC_PENDING_CARD,
    source: 'vba-home-card-kyc-pending',
    i18nPrefix: 'money.vba_home_card.kyc_pending',
    buttonIntent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING,
    ctaClassName: 'bg-muted-pressed',
    ctaTextClassName: 'text-default',
    ctaStartIconName: IconName.Loading,
  },
  finish_verification: {
    componentName: COMPONENT_NAMES.MONEY_VBA_FINISH_VERIFICATION_CARD,
    source: 'vba-home-card-finish-verification',
    i18nPrefix: 'money.vba_home_card.finish_verification',
    buttonIntent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING,
    ctaClassName: 'bg-muted',
    ctaTextClassName: 'text-default',
  },
  kyc_decision: {
    componentName: COMPONENT_NAMES.MONEY_VBA_KYC_DECISION_CARD,
    source: 'vba-home-card-kyc-decision',
    i18nPrefix: 'money.vba_home_card.kyc_decision',
    buttonIntent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING,
    ctaClassName: 'bg-muted',
    ctaTextClassName: 'text-default',
  },
};
