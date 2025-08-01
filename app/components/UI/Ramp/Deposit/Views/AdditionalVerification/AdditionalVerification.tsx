import React, { useCallback } from 'react';
import { Image } from 'react-native';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './AdditionalVerification.styles.ts';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import { getDepositNavbarOptions } from '../../../../Navbar';
import { useNavigation } from '@react-navigation/native';
import PoweredByTransak from '../../components/PoweredByTransak';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import additionalVerificationImage from '../../assets/additional-verification.png';
import { strings } from '../../../../../../../locales/i18n';
import { TextVariant } from '../../../../../../component-library/components/Texts/Text/Text.types';
import { useDepositRouting } from '../../hooks/useDepositRouting.ts';
import { BuyQuote } from '@consensys/native-ramps-sdk';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils.ts';

interface AdditionalVerificationParams {
  quote: BuyQuote;
  kycUrl: string;
  kycWorkflowRunId: string;
  cryptoCurrencyChainId: string;
  paymentMethodId: string;
}

export const createAdditionalVerificationNavDetails =
  createNavigationDetails<AdditionalVerificationParams>(
    Routes.DEPOSIT.ADDITIONAL_VERIFICATION,
  );

const AdditionalVerification = () => {
  const navigation = useNavigation();
  const {
    quote,
    kycUrl,
    kycWorkflowRunId,
    cryptoCurrencyChainId,
    paymentMethodId,
  } = useParams<AdditionalVerificationParams>();

  const { styles, theme } = useStyles(styleSheet, {});

  const { navigateToKycWebview } = useDepositRouting({
    cryptoCurrencyChainId,
    paymentMethodId,
  });

  React.useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: strings('deposit.additional_verification.title') },
        theme,
      ),
    );
  }, [navigation, theme]);

  const handleContinuePress = useCallback(() => {
    navigateToKycWebview({ quote, kycUrl, kycWorkflowRunId });
  }, [navigateToKycWebview, quote, kycUrl, kycWorkflowRunId]);

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content grow>
          <Image
            source={additionalVerificationImage}
            resizeMode={'contain'}
            style={styles.image}
          />
          <Text variant={TextVariant.HeadingLG} style={styles.title}>
            {strings('deposit.additional_verification.title')}
          </Text>

          <Text style={styles.paragraph}>
            {strings('deposit.additional_verification.paragraph_1')}
          </Text>
          <Text style={styles.paragraph}>
            {strings('deposit.additional_verification.paragraph_2')}
          </Text>
        </ScreenLayout.Content>
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content style={styles.footerContent}>
          <Button
            size={ButtonSize.Lg}
            onPress={handleContinuePress}
            label={strings('deposit.additional_verification.button')}
            variant={ButtonVariants.Primary}
            width={ButtonWidthTypes.Full}
          />
          <PoweredByTransak name="powered-by-transak-logo" />
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default AdditionalVerification;
