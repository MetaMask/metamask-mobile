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
import { MoneyVbaGetStartedCardTestIds } from './MoneyVbaGetStartedCard.testIds';

/** Telemetry source passed when this card's CTA opens VBA onboarding. */
export const VBA_GET_STARTED_CARD_SOURCE = 'vba-home-card-get-started';

/**
 * GET_STARTED VBA identity-status card on Money home (Figma node 2267-17522).
 * Shown to a brand-new user who has started nothing: no vendor terms, no KYC
 * session, no autoramp, and no registration evidence. The CTA opens VBA
 * onboarding at the first incomplete module.
 *
 * The card variant is chosen by {@link useVbaHomeCard}; this component only
 * renders and reports.
 */
const MoneyVbaGetStartedCard = () => {
  const { trackButtonClicked, trackComponentViewed } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.MONEY_HOME,
    component_name: COMPONENT_NAMES.MONEY_VBA_GET_STARTED_CARD,
  });
  const openVbaOnboarding = useOpenVbaOnboarding(VBA_GET_STARTED_CARD_SOURCE);
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
      button_intent: MONEY_BUTTON_INTENTS.GET_STARTED,
      label_key: 'money.vba_home_card.get_started.cta',
      redirect_target: SCREEN_NAMES.VBA_ONBOARDING,
    });
    openVbaOnboarding();
  }, [openVbaOnboarding, trackButtonClicked]);

  return (
    // TODO(figma node 2267-17522): verify visual spec — surface, spacing, and
    // typography are provisional (mirrors the MoneyOnboardingCard chrome).
    <Box
      testID={MoneyVbaGetStartedCardTestIds.CONTAINER}
      twClassName="mx-4 mt-2 rounded-3xl bg-muted p-4 gap-4"
    >
      <Box twClassName="gap-1">
        <Text
          variant={TextVariant.HeadingSm}
          fontWeight={FontWeight.Bold}
          testID={MoneyVbaGetStartedCardTestIds.TITLE}
        >
          {strings('money.vba_home_card.get_started.title')}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          testID={MoneyVbaGetStartedCardTestIds.DESCRIPTION}
        >
          {strings('money.vba_home_card.get_started.description')}
        </Text>
      </Box>
      <ButtonBase
        size={ButtonBaseSize.Lg}
        onPress={handleCtaPress}
        testID={MoneyVbaGetStartedCardTestIds.CTA_BUTTON}
      >
        {strings('money.vba_home_card.get_started.cta')}
      </ButtonBase>
    </Box>
  );
};

export default MoneyVbaGetStartedCard;
