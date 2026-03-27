import React, { useCallback } from 'react';
import { Image } from 'react-native';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './AdditionalVerification.styles.ts';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import { getDepositNavbarOptions } from '../../../../Navbar';
import { useNavigation } from '@react-navigation/native';
import PoweredByTransak from '../../components/PoweredByTransak';
import {
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
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
  workFlowRunId: string;
}

export const createAdditionalVerificationNavDetails =
  createNavigationDetails<AdditionalVerificationParams>(
    Routes.DEPOSIT.ADDITIONAL_VERIFICATION,
  );

const AdditionalVerification = () => {
  const navigation = useNavigation();
  const { quote, kycUrl, workFlowRunId } =
    useParams<AdditionalVerificationParams>();

  const { styles, theme } = useStyles(styleSheet, {});

  const { navigateToKycWebview } = useDepositRouting({
    screenLocation: 'AdditionalVerification Screen',
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
    navigateToKycWebview({ quote, kycUrl, workFlowRunId });
  }, [navigateToKycWebview, quote, kycUrl, workFlowRunId]);

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
            variant={ButtonVariant.Primary}
            isFullWidth
          >
            {strings('deposit.additional_verification.button')}
          </Button>
          <PoweredByTransak name="powered-by-transak-logo" />
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default AdditionalVerification;
