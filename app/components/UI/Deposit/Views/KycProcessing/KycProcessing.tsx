import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './KycProcessing.styles';
import ScreenLayout from '../../../Ramp/components/ScreenLayout';
import { createNavigationDetails } from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import { getDepositNavbarOptions } from '../../../Navbar';
import { strings } from '../../../../../../locales/i18n';
import StyledButton from '../../../StyledButton';
import DepositProgressBar from '../../components/DepositProgressBar';
import useKycPolling from '../../hooks/useKycPolling';

export const createKycProcessingNavDetails = createNavigationDetails(
  Routes.DEPOSIT.KYC_PROCESSING,
);

const KycProcessing = () => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});

  const { error, stopPolling } = useKycPolling();

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
    navigation.navigate(Routes.DEPOSIT.VERIFY_IDENTITY);
  };

  if (error) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ScreenLayout.Content grow>
            <DepositProgressBar steps={4} currentStep={3} />
            <View style={styles.container}>
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
