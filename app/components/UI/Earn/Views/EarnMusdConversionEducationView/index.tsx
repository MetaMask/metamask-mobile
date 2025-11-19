import React, { useCallback } from 'react';
import { Hex } from '@metamask/utils';
import { useDispatch } from 'react-redux';
import { RouteProp, useRoute } from '@react-navigation/native';
import { View, Image } from 'react-native';
import { setMusdConversionEducationSeen } from '../../../../../actions/user';
import { useEvmTokenConversion } from '../../hooks/useEvmTokenConversion';
import Logger from '../../../../../util/Logger';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../../component-library/hooks';
import { styleSheet } from './EarnMusdConversionEducationView.styles';
import musdEducationBackground from '../../../../../images/musd-education-screen-background-3x.png';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Route params for the mUSD conversion education screen
 */
interface RouteParams {
  /**
   * The payment token to prefill in the confirmation screen
   */
  preferredPaymentToken?: {
    address: Hex;
    chainId: Hex;
  };
  /**
   * The output token to convert to
   */
  outputToken: {
    address: Hex;
    chainId: Hex;
    symbol: string;
    name: string;
    decimals: number;
  };
  /**
   * Optional allowlist of payment tokens that can be used to pay for the conversion
   * Used to control which payment tokens are available to the user
   */
  allowedPaymentTokens?: Record<Hex, Hex[]>;
}

/**
 * Displays educational content before user's first mUSD conversion.
 * Once completed, marks the education as seen and proceeds to conversion flow.
 */
const EarnMusdConversionEducationView = () => {
  const { styles } = useStyles(styleSheet, {});
  const dispatch = useDispatch();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const { initiateConversion } = useEvmTokenConversion();

  const { preferredPaymentToken, outputToken, allowedPaymentTokens } =
    route.params || {};

  /**
   * Marks the education as seen and initiates the conversion flow.
   */
  const handleContinue = useCallback(async () => {
    try {
      // Mark education as seen so it won't show again
      dispatch(setMusdConversionEducationSeen());

      // Proceed to conversion flow if we have the required params
      if (outputToken && preferredPaymentToken) {
        await initiateConversion({
          outputToken,
          preferredPaymentToken,
          allowedPaymentTokens,
        });
      } else {
        Logger.error(
          new Error('Missing outputToken parameter'),
          '[mUSD Conversion Education] Cannot proceed without output token',
        );
      }
    } catch (error) {
      Logger.error(
        error as Error,
        '[mUSD Conversion Education] Failed to initiate conversion',
      );
    }
  }, [
    dispatch,
    initiateConversion,
    outputToken,
    preferredPaymentToken,
    allowedPaymentTokens,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'top']}>
      <Image source={musdEducationBackground} style={styles.backgroundImage} />

      <View style={styles.content}>
        <Text
          variant={TextVariant.HeadingLG}
          color={TextColor.Default}
          style={styles.heading}
        >
          {strings('earn.musd_conversion_education.heading')}
        </Text>

        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.bodyText}
        >
          {strings('earn.musd_conversion_education.description')}
        </Text>
      </View>
      <Button
        variant={ButtonVariants.Primary}
        label={strings('earn.musd_conversion_education.continue_button')}
        onPress={handleContinue}
        size={ButtonSize.Lg}
        style={styles.continueButton}
      />
    </SafeAreaView>
  );
};

export default EarnMusdConversionEducationView;
