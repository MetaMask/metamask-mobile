import React, { useCallback, useEffect, useRef } from 'react';
import { Image, StyleSheet } from 'react-native';
import {
  Box,
  ButtonBase,
  ButtonBaseSize,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';
import moneyVbaIdentityHero from '../../../../../images/money-vba-identity-hero.png';
import { useOpenVbaOnboarding } from '../../../Ramp/Views/VirtualBankAccount/hooks/useVbaOnboardingRouting';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import { MONEY_BUTTON_TYPES, SCREEN_NAMES } from '../../constants/moneyEvents';
import {
  MONEY_VBA_HOME_CARD_CONFIG,
  type MoneyVbaHomeCardVariant,
} from './MoneyVbaHomeCardConfig';
import { MONEY_VBA_HOME_CARD_TEST_IDS } from './MoneyVbaHomeCard.testIds';

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    height: '100%',
  },
});

/**
 * VBA identity-status card on Money home. Renders every card variant
 * (get_started, account_is_ready, kyc_pending, finish_verification,
 * kyc_decision); all per-variant differences — copy, analytics names, CTA
 * treatment — live in {@link MONEY_VBA_HOME_CARD_CONFIG}.
 *
 * The card variant is chosen by {@link useVbaHomeCard}; this component only
 * renders and reports.
 */
const MoneyVbaHomeCard = ({
  variant,
}: {
  variant: MoneyVbaHomeCardVariant;
}) => {
  const config = MONEY_VBA_HOME_CARD_CONFIG[variant];
  const testIds = MONEY_VBA_HOME_CARD_TEST_IDS[variant];
  const { trackButtonClicked, trackComponentViewed } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.MONEY_HOME,
    component_name: config.componentName,
  });
  const openVbaOnboarding = useOpenVbaOnboarding(config.source);
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
      button_intent: config.buttonIntent,
      label_key: `${config.i18nPrefix}.cta`,
      redirect_target: SCREEN_NAMES.VBA_ONBOARDING,
    });
    // Intentionally not awaited: openVbaOnboarding already routes internal
    // failures to the recoverable-error screen. Log anything that escapes.
    openVbaOnboarding().catch((error) => {
      Logger.error(error as Error, {
        tags: { feature: 'money-home' },
        context: {
          name: 'MoneyVbaHomeCard',
          data: { variant, step: 'openVbaOnboarding' },
        },
      });
    });
  }, [config, openVbaOnboarding, trackButtonClicked, variant]);
  return (
    <Box
      testID={testIds.CONTAINER}
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
          testID={testIds.TITLE}
        >
          {strings(`${config.i18nPrefix}.title`)}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          testID={testIds.DESCRIPTION}
        >
          {strings(`${config.i18nPrefix}.description`)}
        </Text>
      </Box>
      <ButtonBase
        size={ButtonBaseSize.Lg}
        isFullWidth
        startIconName={config.ctaStartIconName}
        twClassName={config.ctaClassName}
        textProps={{ twClassName: config.ctaTextClassName }}
        onPress={handleCtaPress}
        testID={testIds.CTA_BUTTON}
      >
        {strings(`${config.i18nPrefix}.cta`)}
      </ButtonBase>
    </Box>
  );
};

export default MoneyVbaHomeCard;
