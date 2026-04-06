import React, { useCallback } from 'react';
import { Image } from 'react-native';
import {
  Text,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from '../../Deposit/Views/AdditionalVerification/AdditionalVerification.styles';
import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import { getDepositNavbarOptions } from '../../../Navbar';
import { useNavigation } from '@react-navigation/native';
import PoweredByTransak from '../../Deposit/components/PoweredByTransak';
import additionalVerificationImage from '../../Deposit/assets/additional-verification.png';
import { strings } from '../../../../../../locales/i18n';
import { useTransakRouting } from '../../hooks/useTransakRouting';
import { useParams } from '../../../../../util/navigation/navUtils';
import type { TransakBuyQuote } from '@metamask/ramps-controller';

interface V2AdditionalVerificationParams {
  quote: TransakBuyQuote;
  kycUrl: string;
  workFlowRunId: string;
  /** From BuildQuote route; keeps stack amount in sync when opening KYC webview. */
  amount?: number;
}

const V2AdditionalVerification = () => {
  const navigation = useNavigation();
  const { kycUrl, amount: userEnteredAmount } =
    useParams<V2AdditionalVerificationParams>();

  const { styles, theme } = useStyles(styleSheet, {});

  const { navigateToKycWebview } = useTransakRouting({
    screenLocation: 'V2 AdditionalVerification Screen',
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
    navigateToKycWebview({ kycUrl, amount: userEnteredAmount });
  }, [navigateToKycWebview, kycUrl, userEnteredAmount]);

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content grow>
          <Image
            source={additionalVerificationImage}
            resizeMode={'contain'}
            style={styles.image}
          />
          <Text variant={TextVariant.HeadingLg} style={styles.title}>
            {strings('deposit.additional_verification.title')}
          </Text>

          <Text variant={TextVariant.BodyMd} style={styles.paragraph}>
            {strings('deposit.additional_verification.paragraph_1')}
          </Text>
          <Text variant={TextVariant.BodyMd} style={styles.paragraph}>
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

export default V2AdditionalVerification;
