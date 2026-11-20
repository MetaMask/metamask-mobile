/**
 * Collects source of funds and monthly volume for MiCA SOURCE_OF_INCOME form.
 */

import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  Text,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import { useStyles } from '../../../../hooks/useStyles';
import { useParams } from '../../../../../util/navigation/navUtils';
import { strings } from '../../../../../../locales/i18n';
import { useTransakRouting } from '../../hooks/useTransakRouting';
import PoweredByTransak from '../../components/PoweredByTransak';
import Logger from '../../../../../util/Logger';
import BannerAlert from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import type {
  TransakAdditionalRequirement,
  TransakBuyQuote,
} from '@metamask/ramps-controller';
import { useSelector } from 'react-redux';
import { useTransakController } from '../../hooks/useTransakController';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import { parseUserFacingError } from '../../utils/parseUserFacingError';
import DepositTextField from '../../components/DepositTextField';
import DepositSelectField from '../../components/DepositSelectField/DepositSelectField';
import styleSheet from './SourceOfIncome.styles';
import DepositProgressBar from '../../components/DepositProgressBar';
import PrivacySection from '../../components/PrivacySection';

interface SourceOfIncomeMetadata {
  options?: Array<{ name: string; value: string }>;
  documentProofOptions?: string[];
  expiresAt?: string;
  kycUrl?: string;
  workFlowRunId?: string;
}

export interface SourceOfIncomeParams {
  quote: TransakBuyQuote;
  quoteId: string;
  metadata: SourceOfIncomeMetadata;
  /** Optional callback to continue KYC flow (for testing or direct navigation) */
  onSourceOfIncomeSubmitted?: () => void;
  headlessSessionId?: string;
}

const SourceOfIncome = (): React.JSX.Element => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const navigation = useNavigation<AppNavigationProp>();
  const { styles } = useStyles(styleSheet, {});
  const {
    quote,
    quoteId,
    metadata,
    onSourceOfIncomeSubmitted,
    headlessSessionId,
  } = useParams<SourceOfIncomeParams>();
  const {
    submitSourceOfIncome: submitSourceOfIncomeController,
    getKycRequirement,
    getAdditionalRequirements,
  } = useTransakController();
  const { routeAfterAuthentication } = useTransakRouting({
    screenLocation: 'SourceOfIncome Screen',
  });
  const { userRegion } = useRampsUserRegion();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthlyVolume, setMonthlyVolume] = useState('');
  const [sourceOfFundsType, setSourceOfFundsType] = useState('');

  const sourceOfFundsOptions: { name: string; value: string }[] =
    metadata.options || [];

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSubmit = useCallback(async () => {
    setError(null);

    if (
      !monthlyVolume ||
      Number.isNaN(Number(monthlyVolume)) ||
      Number(monthlyVolume) <= 0
    ) {
      setError(strings('deposit.mica.monthlyVolumeInvalid'));
      return;
    }
    if (!sourceOfFundsType) {
      setError(strings('deposit.mica.sourceOfFundsRequired'));
      return;
    }

    setLoading(true);

    try {
      const result = await submitSourceOfIncomeController(
        monthlyVolume,
        sourceOfFundsType,
      );

      if (result.status === 'FAILED') {
        setError(strings('deposit.mica.sourceOfIncomeSubmitError'));
        return;
      }

      await getKycRequirement(quoteId);
      await getAdditionalRequirements(quoteId);

      if (onSourceOfIncomeSubmitted) {
        onSourceOfIncomeSubmitted();
      } else {
        await routeAfterAuthentication(quote);
      }
    } catch (err) {
      Logger.error(err as Error, 'SourceOfIncome: Failed to submit');
      setError(
        parseUserFacingError(
          err,
          strings('deposit.mica.sourceOfIncomeSubmitError'),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [
    monthlyVolume,
    sourceOfFundsType,
    quoteId,
    getKycRequirement,
    getAdditionalRequirements,
    onSourceOfIncomeSubmitted,
    quote,
    routeAfterAuthentication,
    submitSourceOfIncomeController,
  ]);

  const isFormValid = monthlyVolume && sourceOfFundsType;

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <HeaderStandardGlass
          isGlass={isGlassHeader}
          isFloating={false}
          title={strings('deposit.source_of_income.header_title')}
          onBack={handleBack}
          onClose={handleClose}
          backButtonProps={{ testID: 'deposit-back-navbar-button' }}
          closeButtonProps={{ testID: 'deposit-close-navbar-button' }}
          includesTopInset
        />
        <KeyboardAwareScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          enableAutomaticScroll
          showsVerticalScrollIndicator={false}
        >
          <ScreenLayout.Content>
            <DepositProgressBar steps={5} currentStep={4} />

            <View style={styles.section}>
              <Text variant={TextVariant.HeadingMd} style={styles.title}>
                {strings('deposit.source_of_income.title')}
              </Text>
              <Text variant={TextVariant.BodyMd} style={styles.subtitle}>
                {strings('deposit.source_of_income.subtitle')}
              </Text>
            </View>

            {error && (
              <BannerAlert
                severity={BannerAlertSeverity.Error}
                title={strings('deposit.mica.errorTitle')}
                description={error}
                style={styles.errorBanner}
              />
            )}

            <View style={styles.section}>
              <DepositTextField
                label={strings('deposit.source_of_income.monthly_volume_label')}
                placeholder={strings(
                  'deposit.source_of_income.monthly_volume_placeholder',
                )}
                value={monthlyVolume}
                onChangeText={setMonthlyVolume}
                keyboardType="numeric"
                autoCapitalize="none"
              />
              <Text variant={TextVariant.BodySm} style={styles.caption}>
                {strings('deposit.source_of_income.monthly_volume_helper')}
              </Text>
            </View>

            <View style={styles.section}>
              <DepositSelectField
                label={strings(
                  'deposit.source_of_income.source_of_funds_label',
                )}
                placeholder={strings(
                  'deposit.source_of_income.source_of_funds_placeholder',
                )}
                options={sourceOfFundsOptions}
                selectedValue={sourceOfFundsType}
                onValueChange={setSourceOfFundsType}
              />
            </View>
          </ScreenLayout.Content>
        </KeyboardAwareScrollView>
      </ScreenLayout.Body>

      <ScreenLayout.Footer>
        <ScreenLayout.Content style={styles.footerContent}>
          <PrivacySection>
            {strings('deposit.source_of_income.privacy_text')}
          </PrivacySection>

          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={handleSubmit}
            isLoading={loading}
            isDisabled={!isFormValid || loading}
            isFullWidth
          >
            {strings('deposit.source_of_income.continue_button')}
          </Button>

          <PoweredByTransak name="powered-by-transak-logo" />
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default SourceOfIncome;
