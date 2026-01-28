import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Hex } from '@metamask/utils';
import { useDispatch } from 'react-redux';
import { View, Image, useColorScheme, Linking } from 'react-native';
import { setMusdConversionEducationSeen } from '../../../../../actions/user';
import Logger from '../../../../../util/Logger';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../../component-library/hooks';
import { styleSheet } from './EarnMusdConversionEducationView.styles';
import musdEducationBackgroundV2Dark from '../../../../../images/musd-conversion-education-screen-v2-dark-3x.png';
import musdEducationBackgroundV2Light from '../../../../../images/musd-conversion-education-screen-v2-light-3x.png';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMusdConversion } from '../../hooks/useMusdConversion';
import { useParams } from '../../../../../util/navigation/navUtils';
import { useNavigation } from '@react-navigation/native';
import {
  Button as DesignSystemButton,
  ButtonVariant as DesignSystemButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { MUSD_EVENTS_CONSTANTS } from '../../constants/events';
import {
  MUSD_CONVERSION_APY,
  MUSD_TOKEN_ASSET_ID_BY_CHAIN,
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
} from '../../constants/musd';
import { useMusdConversionFlowData } from '../../hooks/useMusdConversionFlowData';
import Routes from '../../../../../constants/navigation/Routes';
import { useRampNavigation } from '../../../Ramp/hooks/useRampNavigation';
import { RampIntent } from '../../../Ramp/types';
import { EARN_TEST_IDS } from '../../constants/testIds';
import AppConstants from '../../../../../core/AppConstants';
interface EarnMusdConversionEducationViewRouteParams {
  /**
   * Indicates if this navigation originated from a deeplink
   * When true, the component determines routing based on user state
   */
  isDeeplink?: boolean;
  /**
   * The payment token to preselect in the confirmation screen
   * Optional - when not provided, determines automatically
   */
  preferredPaymentToken: {
    address: Hex;
    chainId: Hex;
  };
}

/**
 * Displays educational content before user's first mUSD conversion.
 * Once completed, marks the education as seen and proceeds to conversion flow.
 */
const EarnMusdConversionEducationView = () => {
  const dispatch = useDispatch();

  const { initiateConversion } = useMusdConversion();
  const { goToBuy } = useRampNavigation();

  const { preferredPaymentToken, isDeeplink } =
    useParams<EarnMusdConversionEducationViewRouteParams>();

  // Hooks for deeplink case (when no params provided)
  const {
    isGeoEligible,
    hasConvertibleTokens,
    getPaymentTokenForSelectedNetwork,
    getChainIdForBuyFlow,
    getMusdOutputChainId,
    isMusdBuyable,
  } = useMusdConversionFlowData();

  const { styles } = useStyles(styleSheet, {});

  const navigation = useNavigation();

  const colorScheme = useColorScheme();

  const { trackEvent, createEventBuilder } = useMetrics();

  const backgroundImage = useMemo(
    () =>
      colorScheme === 'dark'
        ? musdEducationBackgroundV2Dark
        : musdEducationBackgroundV2Light,
    [colorScheme],
  );

  // Determine deeplink state when this is a deeplink navigation
  const deeplinkState = useMemo(() => {
    if (!isDeeplink) return null;
    if (!isGeoEligible) return { action: 'navigate_home' as const };

    // Try conversion flow if user has convertible tokens
    if (hasConvertibleTokens) {
      const paymentToken = getPaymentTokenForSelectedNetwork();
      if (paymentToken) {
        return {
          action: 'convert' as const,
          paymentToken,
          outputChainId: getMusdOutputChainId(paymentToken.chainId),
        };
      }
    }

    // Fallback to buy if available, otherwise go home
    if (isMusdBuyable) {
      return {
        action: 'buy' as const,
        chainId: getChainIdForBuyFlow(),
      };
    }

    return { action: 'navigate_home' as const };
  }, [
    isDeeplink,
    isGeoEligible,
    hasConvertibleTokens,
    getPaymentTokenForSelectedNetwork,
    getChainIdForBuyFlow,
    getMusdOutputChainId,
    isMusdBuyable,
  ]);

  const primaryButtonText = useMemo(() => {
    if (deeplinkState?.action === 'navigate_home') {
      return strings('earn.musd_conversion.continue');
    }
    if (deeplinkState?.action === 'buy') {
      return strings('earn.musd_conversion.buy_musd');
    }
    return strings('earn.musd_conversion.education.primary_button');
  }, [deeplinkState]);

  const { BUTTON_TYPES, EVENT_LOCATIONS } = MUSD_EVENTS_CONSTANTS;

  const submitScreenViewedEvent = useCallback(() => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.MUSD_FULLSCREEN_ANNOUNCEMENT_DISPLAYED,
      )
        .addProperties({
          location: EVENT_LOCATIONS.CONVERSION_EDUCATION_SCREEN,
        })
        .build(),
    );
  }, [
    EVENT_LOCATIONS.CONVERSION_EDUCATION_SCREEN,
    createEventBuilder,
    trackEvent,
  ]);

  const hasSubmittedScreenViewedEventRef = useRef(false);

  useEffect(() => {
    if (hasSubmittedScreenViewedEventRef.current) {
      return;
    }
    hasSubmittedScreenViewedEventRef.current = true;
    submitScreenViewedEvent();
  }, [submitScreenViewedEvent]);

  const submitContinuePressedEvent = useCallback(() => {
    let redirectsTo = EVENT_LOCATIONS.CUSTOM_AMOUNT_SCREEN;
    if (deeplinkState?.action === 'navigate_home') {
      redirectsTo = EVENT_LOCATIONS.HOME_SCREEN;
    } else if (deeplinkState?.action === 'buy') {
      redirectsTo = EVENT_LOCATIONS.BUY_SCREEN;
    }

    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.MUSD_FULLSCREEN_ANNOUNCEMENT_BUTTON_CLICKED,
      )
        .addProperties({
          location: EVENT_LOCATIONS.CONVERSION_EDUCATION_SCREEN,
          button_type: BUTTON_TYPES.PRIMARY,
          button_text: primaryButtonText,
          redirects_to: redirectsTo,
        })
        .build(),
    );
  }, [
    trackEvent,
    createEventBuilder,
    EVENT_LOCATIONS.CONVERSION_EDUCATION_SCREEN,
    EVENT_LOCATIONS.CUSTOM_AMOUNT_SCREEN,
    EVENT_LOCATIONS.BUY_SCREEN,
    EVENT_LOCATIONS.HOME_SCREEN,
    BUTTON_TYPES.PRIMARY,
    primaryButtonText,
    deeplinkState,
  ]);

  const submitGoBackPressedEvent = () => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.MUSD_FULLSCREEN_ANNOUNCEMENT_BUTTON_CLICKED,
      )
        .addProperties({
          location: EVENT_LOCATIONS.CONVERSION_EDUCATION_SCREEN,
          button_type: BUTTON_TYPES.SECONDARY,
          button_text: strings(
            'earn.musd_conversion.education.secondary_button',
          ),
        })
        .build(),
    );
  };

  const handleContinue = useCallback(async () => {
    try {
      submitContinuePressedEvent();
      // Mark education as seen so it won't show again
      dispatch(setMusdConversionEducationSeen(true));

      // Handle deeplink case
      if (deeplinkState) {
        if (deeplinkState.action === 'navigate_home') {
          navigation.navigate(Routes.WALLET.HOME, {
            screen: Routes.WALLET.TAB_STACK_FLOW,
            params: {
              screen: Routes.WALLET_VIEW,
            },
          });
          return;
        }

        if (deeplinkState.action === 'buy') {
          const chainId =
            deeplinkState.chainId || MUSD_CONVERSION_DEFAULT_CHAIN_ID;
          const rampIntent: RampIntent = {
            assetId: MUSD_TOKEN_ASSET_ID_BY_CHAIN[chainId],
          };
          goToBuy(rampIntent);
          return;
        }

        if (deeplinkState.action === 'convert') {
          await initiateConversion({
            preferredPaymentToken: deeplinkState.paymentToken,
            skipEducationCheck: true,
          });
          return;
        }
      }

      // Proceed to conversion flow if we have the required params (normal flow)
      if (!isDeeplink && preferredPaymentToken) {
        await initiateConversion({
          preferredPaymentToken,
          skipEducationCheck: true,
        });
        return;
      }

      Logger.error(
        new Error('Missing required parameters'),
        '[mUSD Conversion Education] Cannot proceed without preferredPaymentToken',
      );
    } catch (error) {
      Logger.error(
        error as Error,
        '[mUSD Conversion Education] Failed to initiate conversion',
      );
    }
  }, [
    dispatch,
    initiateConversion,
    preferredPaymentToken,
    submitContinuePressedEvent,
    deeplinkState,
    navigation,
    goToBuy,
    isDeeplink,
  ]);

  const handleGoBack = () => {
    submitGoBackPressedEvent();
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleTermsOfUsePressed = () => {
    Linking.openURL(AppConstants.URLS.MUSD_CONVERSION_BONUS_TERMS_OF_USE);
  };

  return (
    // Do not remove the top edge as this screen does not have a navbar set in the route options.
    <SafeAreaView
      style={styles.container}
      edges={['top', 'bottom']}
      testID={EARN_TEST_IDS.MUSD.CONVERSION_EDUCATION_VIEW.CONTAINER}
    >
      <View style={styles.content}>
        <Text style={styles.heading} numberOfLines={2} adjustsFontSizeToFit>
          {strings('earn.musd_conversion.education.heading', {
            percentage: MUSD_CONVERSION_APY,
          })}
        </Text>
        <Text variant={TextVariant.BodyMD} style={styles.bodyText}>
          {strings('earn.musd_conversion.education.description', {
            percentage: MUSD_CONVERSION_APY,
          })}{' '}
          <Text
            variant={TextVariant.BodyMD}
            style={styles.termsText}
            onPress={handleTermsOfUsePressed}
          >
            {strings('earn.musd_conversion.education.terms_apply')}
          </Text>
        </Text>
      </View>
      <View style={styles.imageContainer}>
        <Image
          source={backgroundImage}
          style={styles.backgroundImage}
          testID={EARN_TEST_IDS.MUSD.CONVERSION_EDUCATION_VIEW.BACKGROUND_IMAGE}
        />
      </View>

      <View style={styles.buttonsContainer}>
        <Button
          variant={ButtonVariants.Primary}
          label={primaryButtonText}
          onPress={handleContinue}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          testID={EARN_TEST_IDS.MUSD.CONVERSION_EDUCATION_VIEW.PRIMARY_BUTTON}
        />
        <DesignSystemButton
          variant={DesignSystemButtonVariant.Tertiary}
          isFullWidth
          onPress={handleGoBack}
          testID={EARN_TEST_IDS.MUSD.CONVERSION_EDUCATION_VIEW.SECONDARY_BUTTON}
        >
          <Text variant={TextVariant.BodyMDMedium}>
            {strings('earn.musd_conversion.education.secondary_button')}
          </Text>
        </DesignSystemButton>
      </View>
    </SafeAreaView>
  );
};

export default EarnMusdConversionEducationView;
