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
  IconColor,
  Spinner,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Logger from '../../../../../util/Logger';
import {
  canOpenPersistedVbaDetails,
  navigateToVbaOnboardingDestination,
  openVbaEntry,
  resolveVbaOnboarding,
} from '../../../Ramp/Views/VirtualBankAccount/hooks/useVbaOnboardingRouting';
import {
  endVbaCufJourney,
  startVbaCufJourney,
} from '../../../Ramp/Views/VirtualBankAccount/vbaCufTrace';
import {
  VBA_CUF_END_REASON,
  VBA_CUF_ENTRY_SURFACE,
} from '../../../Ramp/Views/VirtualBankAccount/vbaCufTags';
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
 * The card variant is chosen by {@link useVbaHomeCard}. The CTA hydrates while
 * this card remains visible, then opens the resolved onboarding destination.
 * This avoids flashing a standalone full-screen loading route.
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
  const isMountedRef = useRef(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isRouting, setIsRouting] = useState(false);

  useEffect(() => {
    if (hasTrackedCardViewRef.current) {
      return;
    }
    hasTrackedCardViewRef.current = true;
    trackComponentViewed();
  }, [trackComponentViewed]);

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  const handleCtaPress = useCallback(async () => {
    if (hasPendingCtaOpenRef.current) {
      return;
    }
    startVbaCufJourney(VBA_CUF_ENTRY_SURFACE.HOME_CARD);
    hasPendingCtaOpenRef.current = true;
    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: config.buttonIntent,
      label_key: `${config.i18nPrefix}.cta`,
      redirect_target: SCREEN_NAMES.VBA_ONBOARDING,
    });

    // The pending card is itself derived from current KYC state, so its
    // destination is already known. Re-hydrating here only makes the card
    // flicker before opening the same screen.
    if (variant === 'kyc_pending') {
      navigateToVbaOnboardingDestination(navigation, 'kycPending');
      hasPendingCtaOpenRef.current = false;
      return;
    }

    // Only an Approved autoramp can open details from persisted state.
    // account_is_ready also covers provider-final KYC with no autoramp yet,
    // and that case must stay on the card while hydrate runs. This path is
    // synchronous, same as the pending card, and Money home stays mounted
    // under details, so the guard has to clear or the CTA stays dead after
    // the user comes back.
    if (variant === 'account_is_ready' && canOpenPersistedVbaDetails()) {
      openVbaEntry(navigation, { source: config.source });
      hasPendingCtaOpenRef.current = false;
      return;
    }

    setIsRouting(true);
    try {
      const resolved = await resolveVbaOnboarding(config.source);
      if (!isMountedRef.current) {
        return;
      }
      if (resolved.status === 'error') {
        endVbaCufJourney(false, VBA_CUF_END_REASON.ERROR);
        navigateToVbaOnboardingDestination(navigation, 'error');
        return;
      }

      Logger.log('[vba-onboarding] resume', {
        source: config.source,
        snapshot: resolved.snapshot,
        destinationId: resolved.destinationId,
      });
      navigateToVbaOnboardingDestination(
        navigation,
        resolved.destinationId,
        resolved.snapshot,
      );
    } catch (error) {
      Logger.error(error as Error, {
        tags: { feature: 'vba-onboarding' },
        context: {
          name: 'MoneyVbaHomeCard',
          data: { source: config.source },
        },
      });
      if (isMountedRef.current) {
        endVbaCufJourney(false, VBA_CUF_END_REASON.ERROR);
        navigateToVbaOnboardingDestination(navigation, 'error');
      }
    } finally {
      hasPendingCtaOpenRef.current = false;
      if (isMountedRef.current) {
        setIsRouting(false);
      }
    }
  }, [config, navigation, trackButtonClicked, variant]);

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
      isLoading={isRouting}
      // Icon-only loading: a loadingText row is wider than the plain label
      // and shifts it right. The spinner inherits the label color from
      // textClassName so it stays visible on the light CTA backgrounds.
      startAccessory={
        variant === 'kyc_pending' ? (
          <Spinner
            color={IconColor.IconDefault}
            testID={`${testIds.CTA_BUTTON}-spinner`}
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        ) : undefined
      }
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
