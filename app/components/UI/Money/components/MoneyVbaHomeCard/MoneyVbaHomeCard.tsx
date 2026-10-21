import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet } from 'react-native';
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
import Logger from '../../../../../util/Logger';
import { useOpenVbaOnboarding } from '../../../Ramp/Views/VirtualBankAccount/hooks/useVbaOnboardingRouting';
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
 * VBA identity-status card on Money home. Renders every card variant
 * (get_started, account_is_ready, kyc_pending, finish_verification,
 * kyc_decision); all per-variant differences — copy, analytics names, CTA
 * treatment, hero art — live in {@link MONEY_VBA_HOME_CARD_CONFIG}.
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
  const [isDismissed, setIsDismissed] = useState(false);
  // True while the CTA's in-place hydrate runs. The spinner replaces the CTA
  // icon and blocks re-presses so repeated taps cannot start concurrent
  // hydrates.
  const [isOpening, setIsOpening] = useState(false);

  useEffect(() => {
    if (hasTrackedCardViewRef.current) {
      return;
    }
    hasTrackedCardViewRef.current = true;
    trackComponentViewed();
  }, [trackComponentViewed]);

  const handleCtaPress = useCallback(() => {
    if (isOpening) {
      return;
    }
    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: config.buttonIntent,
      label_key: `${config.i18nPrefix}.cta`,
      redirect_target: SCREEN_NAMES.VBA_ONBOARDING,
    });
    setIsOpening(true);
    // Intentionally not awaited: openVbaOnboarding already routes internal
    // failures to the recoverable-error screen. Log anything that escapes.
    openVbaOnboarding()
      .catch((error) => {
        Logger.error(error as Error, {
          tags: { feature: 'money-home' },
          context: {
            name: 'MoneyVbaHomeCard',
            data: { variant, step: 'openVbaOnboarding' },
          },
        });
      })
      .finally(() => setIsOpening(false));
  }, [config, isOpening, openVbaOnboarding, trackButtonClicked, variant]);

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

  const ctaButton = (
    <ButtonBase
      size={ButtonBaseSize.Lg}
      isFullWidth
      isLoading={isOpening}
      startIconName={config.ctaStartIconName}
      twClassName={config.ctaClassName}
      textClassName={() => config.ctaTextClassName}
      onPress={handleCtaPress}
      testID={testIds.CTA_BUTTON}
    >
      {strings(`${config.i18nPrefix}.cta`)}
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
        <Image
          source={config.heroArt.source}
          style={{ width: config.heroArt.width, height: config.heroArt.height }}
          resizeMode="contain"
        />
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
            {/* No isOpening guard here — the disabled Pressable blocks
                presses; keep both in sync if these handlers move. */}
            <ButtonBase
              size={ButtonBaseSize.Lg}
              isFullWidth
              isDisabled={isOpening}
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
