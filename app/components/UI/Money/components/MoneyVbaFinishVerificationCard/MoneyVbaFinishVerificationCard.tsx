import React, { useCallback, useEffect, useRef } from 'react';
import {
  Box,
  ButtonBase,
  ButtonBaseSize,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useOpenVbaOnboarding } from '../../../Ramp/Views/VirtualBankAccount/hooks/useVbaOnboardingRouting';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { MoneyVbaFinishVerificationCardTestIds } from './MoneyVbaFinishVerificationCard.testIds';

/** Telemetry source passed when this card's CTA opens VBA onboarding. */
export const VBA_FINISH_VERIFICATION_CARD_SOURCE =
  'vba-home-card-finish-verification';

/**
 * FINISH_VERIFICATION VBA identity-status card on Money home (Figma node
 * 2267-18364). Shown when onboarding started but is incomplete (local vendor
 * terms accepted, or a live non-terminal KYC session). The CTA opens VBA
 * onboarding, which resumes the incomplete session.
 *
 * The card variant is chosen by {@link useVbaHomeCard}; this component only
 * renders and reports.
 */
const MoneyVbaFinishVerificationCard = () => {
  const { trackButtonClicked, trackComponentViewed } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.MONEY_HOME,
    component_name: COMPONENT_NAMES.MONEY_VBA_FINISH_VERIFICATION_CARD,
  });
  const openVbaOnboarding = useOpenVbaOnboarding(
    VBA_FINISH_VERIFICATION_CARD_SOURCE,
  );
  const hasTrackedCardViewRef = useRef(false);

  useEffect(() => {
    if (hasTrackedCardViewRef.current) {
      return;
    }
    hasTrackedCardViewRef.current = true;
    trackComponentViewed();
  }, [trackComponentViewed]);

  const handleCtaPress = useCallback(() => {
    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING,
      label_key: 'money.vba_home_card.finish_verification.cta',
      redirect_target: SCREEN_NAMES.VBA_ONBOARDING,
    });
    openVbaOnboarding();
  }, [openVbaOnboarding, trackButtonClicked]);

  return (
    // TODO(figma node 2267-18364): verify visual spec — surface, spacing, and
    // typography are provisional (mirrors the MoneyOnboardingCard chrome).
    <Box
      testID={MoneyVbaFinishVerificationCardTestIds.CONTAINER}
      twClassName="mx-4 mt-2 rounded-3xl bg-muted p-4 gap-4"
    >
      <Box twClassName="gap-1">
        <Text
          variant={TextVariant.HeadingSm}
          fontWeight={FontWeight.Bold}
          testID={MoneyVbaFinishVerificationCardTestIds.TITLE}
        >
          {strings('money.vba_home_card.finish_verification.title')}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          testID={MoneyVbaFinishVerificationCardTestIds.DESCRIPTION}
        >
          {strings('money.vba_home_card.finish_verification.description')}
        </Text>
      </Box>
      <ButtonBase
        size={ButtonBaseSize.Lg}
        onPress={handleCtaPress}
        testID={MoneyVbaFinishVerificationCardTestIds.CTA_BUTTON}
      >
        {strings('money.vba_home_card.finish_verification.cta')}
      </ButtonBase>
    </Box>
  );
};

export default MoneyVbaFinishVerificationCard;
