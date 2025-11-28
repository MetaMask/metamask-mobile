import React, { useCallback } from 'react';
import { Hex } from '@metamask/utils';
import { useDispatch } from 'react-redux';
import { View, Image } from 'react-native';
import { setMusdConversionEducationSeen } from '../../../../../actions/user';
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
import { useMusdConversion } from '../../hooks/useMusdConversion';
import { useParams } from '../../../../../util/navigation/navUtils';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getCloseOnlyNavbar } from '../../../Navbar';
import { useTheme } from '../../../../../util/theme';

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
  const { colors } = useTheme();

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions(getCloseOnlyNavbar(navigation, colors));
    }, [navigation, colors]),
  );

  const handleContinue = useCallback(async () => {
    try {
      // Mark education as seen so it won't show again
      dispatch(setMusdConversionEducationSeen());

      // Proceed to conversion flow if we have the required params
      if (outputChainId && preferredPaymentToken) {
        await initiateConversion({
          outputChainId,
          preferredPaymentToken,
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
  }, [dispatch, initiateConversion, outputChainId, preferredPaymentToken]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'top']}>
      <Image source={musdEducationBackground} style={styles.backgroundImage} />

      <View style={styles.content}>
        <Text
          variant={TextVariant.HeadingLG}
          color={TextColor.Default}
          style={styles.heading}
        >
          {strings('earn.musd_conversion.education.heading')}
        </Text>

        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.bodyText}
        >
          {strings('earn.musd_conversion.education.description')}
        </Text>
      </View>
      <Button
        variant={ButtonVariants.Primary}
        label={strings('earn.musd_conversion.education.continue_button')}
        onPress={handleContinue}
        size={ButtonSize.Lg}
        style={styles.continueButton}
      />
    </SafeAreaView>
  );
};

export default EarnMusdConversionEducationView;
