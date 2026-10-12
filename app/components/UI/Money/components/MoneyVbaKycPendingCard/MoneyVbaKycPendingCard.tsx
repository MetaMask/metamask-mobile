import React, { useCallback, useEffect, useRef } from 'react';
import { Image, StyleSheet } from 'react-native';
import {
  Box,
  ButtonBase,
  ButtonBaseSize,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import moneyVbaIdentityHero from '../../../../../images/money-vba-identity-hero.png';
import { useOpenVbaOnboarding } from '../../../Ramp/Views/VirtualBankAccount/hooks/useVbaOnboardingRouting';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { MoneyVbaKycPendingCardTestIds } from './MoneyVbaKycPendingCard.testIds';

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    height: '100%',
  },
});

/** Telemetry source passed when this card's CTA opens VBA onboarding. */
export const VBA_KYC_PENDING_CARD_SOURCE = 'vba-home-card-kyc-pending';

/**
 * KYC_PENDING VBA identity-status card on Money home (Figma node
 * 2254-13372). Shown while the vendor is processing KYC, or once the provider
 * flow has been submitted. The CTA opens VBA onboarding, which lands on the
 * status screen.
 *
 * The card variant is chosen by {@link useVbaHomeCard}; this component only
 * renders and reports.
 */
const MoneyVbaKycPendingCard = () => {
  const { trackButtonClicked, trackComponentViewed } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.MONEY_HOME,
    component_name: COMPONENT_NAMES.MONEY_VBA_KYC_PENDING_CARD,
  });
  const openVbaOnboarding = useOpenVbaOnboarding(VBA_KYC_PENDING_CARD_SOURCE);
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
      label_key: 'money.vba_home_card.kyc_pending.cta',
      redirect_target: SCREEN_NAMES.VBA_ONBOARDING,
    });
    openVbaOnboarding();
  }, [openVbaOnboarding, trackButtonClicked]);

  return (
    <Box
      testID={MoneyVbaKycPendingCardTestIds.CONTAINER}
      twClassName="mx-4 mt-2 rounded-2xl bg-muted p-4"
    >
      <Box twClassName="h-[185px] w-full overflow-hidden rounded-[14px]">
        <Image
          source={moneyVbaIdentityHero}
          style={styles.hero}
          resizeMode="cover"
        />
      </Box>
      <Box twClassName="gap-1 py-4">
        <Text
          variant={TextVariant.HeadingLg}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextDefault}
          testID={MoneyVbaKycPendingCardTestIds.TITLE}
        >
          {strings('money.vba_home_card.kyc_pending.title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          testID={MoneyVbaKycPendingCardTestIds.DESCRIPTION}
        >
          {strings('money.vba_home_card.kyc_pending.description')}
        </Text>
      </Box>
      <ButtonBase
        size={ButtonBaseSize.Lg}
        isFullWidth
        startIconName={IconName.Loading}
        twClassName="bg-muted-pressed"
        textProps={{ twClassName: 'text-default' }}
        onPress={handleCtaPress}
        testID={MoneyVbaKycPendingCardTestIds.CTA_BUTTON}
      >
        {strings('money.vba_home_card.kyc_pending.cta')}
      </ButtonBase>
    </Box>
  );
};

export default MoneyVbaKycPendingCard;
