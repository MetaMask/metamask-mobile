import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Hex } from '@metamask/utils';
import { useDispatch } from 'react-redux';
import { View, Image, useColorScheme } from 'react-native';
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
interface EarnMusdConversionEducationViewRouteParams {
  /**
   * The payment token to preselect in the confirmation screen
   */
  preferredPaymentToken?: {
    address: Hex;
    chainId: Hex;
  };
  /**
   * The output token's chainId
   */
  outputChainId: Hex;
}

/**
 * Displays educational content before user's first mUSD conversion.
 * Once completed, marks the education as seen and proceeds to conversion flow.
 */
const EarnMusdConversionEducationView = () => {
  const dispatch = useDispatch();

  const { initiateConversion } = useMusdConversion();

  const { preferredPaymentToken, outputChainId } =
    useParams<EarnMusdConversionEducationViewRouteParams>();

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
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.MUSD_FULLSCREEN_ANNOUNCEMENT_BUTTON_CLICKED,
      )
        .addProperties({
          location: EVENT_LOCATIONS.CONVERSION_EDUCATION_SCREEN,
          button_type: BUTTON_TYPES.PRIMARY,
          button_text: strings('earn.musd_conversion.education.primary_button'),
          redirects_to: EVENT_LOCATIONS.CUSTOM_AMOUNT_SCREEN, // Redirects to custom amount screen.
        })
        .build(),
    );
  }, [
    trackEvent,
    createEventBuilder,
    EVENT_LOCATIONS.CONVERSION_EDUCATION_SCREEN,
    EVENT_LOCATIONS.CUSTOM_AMOUNT_SCREEN,
    BUTTON_TYPES.PRIMARY,
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

      // Proceed to conversion flow if we have the required params
      if (outputChainId && preferredPaymentToken) {
        await initiateConversion({
          outputChainId,
          preferredPaymentToken,
          skipEducationCheck: true,
        });
        return;
      }

      Logger.error(
        new Error('Missing required parameters'),
        '[mUSD Conversion Education] Cannot proceed without outputChainId and preferredPaymentToken',
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
    outputChainId,
    preferredPaymentToken,
    submitContinuePressedEvent,
  ]);

  const handleGoBack = () => {
    submitGoBackPressedEvent();
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    // Do not remove the top edge as this screen does not have a navbar set in the route options.
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.heading} numberOfLines={3} adjustsFontSizeToFit>
          {strings('earn.musd_conversion.education.heading')}
        </Text>
        <Text variant={TextVariant.BodyMD} style={styles.bodyText}>
          {strings('earn.musd_conversion.education.description')}
        </Text>
      </View>
      <View style={styles.imageContainer}>
        <Image source={backgroundImage} style={styles.backgroundImage} />
      </View>

      <View style={styles.buttonsContainer}>
        <Button
          variant={ButtonVariants.Primary}
          label={strings('earn.musd_conversion.education.primary_button')}
          onPress={handleContinue}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
        />
        <DesignSystemButton
          variant={DesignSystemButtonVariant.Tertiary}
          isFullWidth
          onPress={handleGoBack}
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
