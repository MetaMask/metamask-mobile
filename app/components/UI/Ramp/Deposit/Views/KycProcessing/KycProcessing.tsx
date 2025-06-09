import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import styleSheet from './KycProcessing.styles';
import { useNavigation } from '@react-navigation/native';
import StyledButton from '../../../../StyledButton';
import DepositProgressBar from '../../components/DepositProgressBar';
import useKycPolling from '../../hooks/useKycPolling';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { useStyles } from '../../../../../../component-library/hooks';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import { getDepositNavbarOptions } from '../../../../Navbar';
import { strings } from '../../../../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../../component-library/components/Icons/Icon';
import { createVerifyIdentityNavDetails } from '../VerifyIdentity/VerifyIdentity';
import { createProviderWebviewNavDetails } from '../ProviderWebview/ProviderWebview';
import { BuyQuote } from '@consensys/native-ramps-sdk';

export interface KycProcessingParams {
  quote: BuyQuote;
}

export const createKycProcessingNavDetails =
  createNavigationDetails<KycProcessingParams>(Routes.DEPOSIT.KYC_PROCESSING);

const KycProcessing = () => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const { quote } = useParams<KycProcessingParams>();

  const { error, kycApproved, stopPolling } = useKycPolling(
    quote,
    10000,
    true,
    30,
  );

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: strings('deposit.kyc_processing.title') },
        theme,
      ),
    );
  }, [navigation, theme]);

  const handleBrowseTokens = () => {
    stopPolling();
    navigation.navigate(Routes.BROWSER_TAB_HOME);
  };

  const handleRetryVerification = () => {
    navigation.navigate(...createVerifyIdentityNavDetails({ quote }));
  };

  const handleContinue = () => {
    navigation.navigate(...createProviderWebviewNavDetails({ quote }));
  };

  if (error) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ScreenLayout.Content grow>
            <DepositProgressBar steps={4} currentStep={3} />
            <View style={styles.container}>
              <Icon
                name={IconName.CircleX}
                size={IconSize.Xl}
                color={IconColor.Error}
              />

              <Text variant={TextVariant.BodyMDBold} style={styles.heading}>
                {strings('deposit.kyc_processing.error_heading')}
              </Text>
              <Text variant={TextVariant.BodyMD} style={styles.description}>
                {strings('deposit.kyc_processing.error_description')}
              </Text>
            </View>
          </ScreenLayout.Content>
        </ScreenLayout.Body>
        <ScreenLayout.Footer>
          <ScreenLayout.Content>
            <StyledButton type="confirm" onPress={handleRetryVerification}>
              {strings('deposit.kyc_processing.error_button')}
            </StyledButton>
          </ScreenLayout.Content>
        </ScreenLayout.Footer>
      </ScreenLayout>
    );
  }

  if (kycApproved) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ScreenLayout.Content grow>
            <DepositProgressBar steps={4} currentStep={3} />
            <View style={styles.container}>
              <View style={styles.iconContainer}>
                <Icon
                  name={IconName.CheckBold}
                  size={IconSize.Xl}
                  color={IconColor.Success}
                />
              </View>

              <Text variant={TextVariant.BodyMDBold} style={styles.heading}>
                {strings('deposit.kyc_processing.success_heading')}
              </Text>

              <Text variant={TextVariant.BodyMD} style={styles.description}>
                {strings('deposit.kyc_processing.success_description')}
              </Text>
            </View>
          </ScreenLayout.Content>
        </ScreenLayout.Body>
        <ScreenLayout.Footer>
          <ScreenLayout.Content>
            <StyledButton type="confirm" onPress={handleContinue}>
              {strings('deposit.kyc_processing.success_button')}
            </StyledButton>
          </ScreenLayout.Content>
        </ScreenLayout.Footer>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content grow>
          <DepositProgressBar steps={4} currentStep={3} />
          <View style={styles.container}>
            <ActivityIndicator
              size="large"
              color={theme.colors.primary.default}
              testID="activity-indicator"
            />

            <Text variant={TextVariant.BodyMDBold} style={styles.heading}>
              {strings('deposit.kyc_processing.heading')}
            </Text>

            <Text variant={TextVariant.BodyMD} style={styles.description}>
              {strings('deposit.kyc_processing.description')}
            </Text>
          </View>
        </ScreenLayout.Content>
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <StyledButton type="confirm" onPress={handleBrowseTokens}>
            {strings('deposit.kyc_processing.button')}
          </StyledButton>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default KycProcessing;
