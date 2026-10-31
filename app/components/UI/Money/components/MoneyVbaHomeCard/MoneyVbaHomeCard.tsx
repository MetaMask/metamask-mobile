import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { brandColor } from '@metamask/design-tokens';
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
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { openVbaEntry } from '../../../Ramp/Views/VirtualBankAccount/hooks/useVbaOnboardingRouting';
import { startVbaCufJourney } from '../../../Ramp/Views/VirtualBankAccount/vbaCufTrace';
import { VBA_CUF_ENTRY_SURFACE } from '../../../Ramp/Views/VirtualBankAccount/vbaCufTags';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import {
  MONEY_VBA_HOME_CARD_CONFIG,
  type MoneyVbaHomeCardVariant,
} from './MoneyVbaHomeCardConfig';
import { MONEY_VBA_HOME_CARD_TEST_IDS } from './MoneyVbaHomeCard.testIds';
import MoneyVbaHomeCardHeroAnimation from './MoneyVbaHomeCardHeroAnimation';

const styles = StyleSheet.create({
  heroContainer: {
    alignSelf: 'stretch',
    height: 185,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

/**
 * Hero background gradient, from the card's Figma spec (node 2158-5306):
 * `linear-gradient(224deg, #C66EF5 31.62%, #73A6FF 87.04%)` over a
 * `#C66EF5` fallback. React Native renders a single gradient layer, so the
 * spec's second layer is dropped.
 */
const HERO_GRADIENT_COLORS = [brandColor.purple300, brandColor.indigo200];
const HERO_GRADIENT_LOCATIONS = [0.3162, 0.8704];
const HERO_GRADIENT_ANGLE = 224;

/**
 * Blocks repeat CTA taps until the loading route has had time to present. A
 * second reset in that window would remount the loading route and start a
 * second hydrate.
 */
const CTA_REENTRY_WINDOW_MS = 1000;

/**
 * VBA identity-status card on Money home. Renders every card variant
 * (get_started, account_is_ready, kyc_pending, finish_verification,
 * kyc_decision); all per-variant differences — copy, analytics names, CTA
 * treatment, hero art and optional Rive hero — live in {@link MONEY_VBA_HOME_CARD_CONFIG}.
 *
 * The card variant is chosen by {@link useVbaHomeCard}. The CTA routes
 * immediately to the onboarding loading screen, which hydrates status and
 * forwards to the first incomplete module; the card never shows an in-place
 * busy state.
 */
const MoneyVbaHomeCard = ({
  variant,
}: {
  variant: MoneyVbaHomeCardVariant;
}) => {
  const config = MONEY_VBA_HOME_CARD_CONFIG[variant];
  const testIds = MONEY_VBA_HOME_CARD_TEST_IDS[variant];
  const navigation = useNavigation<AppNavigationProp>();
  const { trackButtonClicked, trackComponentViewed } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.MONEY_HOME,
    component_name: config.componentName,
  });
  const hasTrackedCardViewRef = useRef(false);
  const hasPendingCtaOpenRef = useRef(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (hasTrackedCardViewRef.current) {
      return;
    }
    hasTrackedCardViewRef.current = true;
    trackComponentViewed();
  }, [trackComponentViewed]);

  const handleCtaPress = useCallback(() => {
    // A status-only CTA (KYC_PENDING) is disabled and never fires.
    if (hasPendingCtaOpenRef.current || config.cta.isDisabled) {
      return;
    }
    startVbaCufJourney(VBA_CUF_ENTRY_SURFACE.HOME_CARD);
    hasPendingCtaOpenRef.current = true;
    // Self-clears so the CTA recovers if no navigator presents the route.
    setTimeout(() => {
      hasPendingCtaOpenRef.current = false;
    }, CTA_REENTRY_WINDOW_MS);
    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: config.cta.buttonIntent,
      label_key: `${config.i18nPrefix}.cta`,
      redirect_target: SCREEN_NAMES.VBA_ONBOARDING,
    });
    // Route immediately: the loading screen hydrates and replaces itself with
    // the first incomplete module, so the CTA never shows an in-place busy
    // state while status resolves.
    openVbaEntry(navigation, {
      source: config.source,
    });
  }, [config, navigation, trackButtonClicked]);

  const handleDismissPress = useCallback(() => {
    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.DISMISS,
      label_key: `${config.i18nPrefix}.dismiss`,
    });
    setIsDismissed(true);
  }, [config, trackButtonClicked]);

  if (isDismissed) {
    return null;
  }

  const { cta } = config;
  const ctaLabel = strings(`${config.i18nPrefix}.cta`);
  const ctaButton = cta.isDisabled ? (
    <ButtonBase
      size={ButtonBaseSize.Lg}
      isFullWidth
      isDisabled
      testID={testIds.CTA_BUTTON}
    >
      {ctaLabel}
    </ButtonBase>
  ) : (
    <ButtonBase
      size={ButtonBaseSize.Lg}
      isFullWidth
      twClassName={cta.className}
      textClassName={() => cta.textClassName}
      onPress={handleCtaPress}
      testID={testIds.CTA_BUTTON}
    >
      {ctaLabel}
    </ButtonBase>
  );

  return (
    <Box
      testID={testIds.CONTAINER}
      twClassName="mx-4 mt-2 rounded-2xl bg-muted p-4"
    >
      <LinearGradient
        colors={HERO_GRADIENT_COLORS}
        locations={HERO_GRADIENT_LOCATIONS}
        useAngle
        angle={HERO_GRADIENT_ANGLE}
        style={styles.heroContainer}
      >
        {config.heroAnimation ? (
          <MoneyVbaHomeCardHeroAnimation
            animation={config.heroAnimation}
            fallback={config.heroArt}
          />
        ) : (
          <Image
            source={config.heroArt.source}
            style={{
              width: config.heroArt.width,
              height: config.heroArt.height,
            }}
            resizeMode="contain"
          />
        )}
      </LinearGradient>
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
      {config.isDismissible ? (
        <Box twClassName="flex-row gap-3">
          <Box twClassName="flex-1">
            <ButtonBase
              size={ButtonBaseSize.Lg}
              isFullWidth
              twClassName="bg-muted"
              textProps={{ twClassName: 'text-default' }}
              onPress={handleDismissPress}
              testID={testIds.DISMISS_BUTTON}
            >
              {strings(`${config.i18nPrefix}.dismiss`)}
            </ButtonBase>
          </Box>
          <Box twClassName="flex-1">{ctaButton}</Box>
        </Box>
      ) : (
        ctaButton
      )}
    </Box>
  );
};

export default MoneyVbaHomeCard;
