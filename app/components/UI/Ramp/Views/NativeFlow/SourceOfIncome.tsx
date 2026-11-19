/**
 * Collects source of funds, monthly volume, employment status, and nationality
 * for EEA users per MiCA requirements.
 */

import React, { useCallback, useState, useEffect } from 'react';
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
import { ButtonVariants } from '../../../../../component-library/components/Buttons/Button';
import type {
  TransakAdditionalRequirement,
  TransakBuyQuote,
} from '@metamask/ramps-controller';
import { useSelector } from 'react-redux';
import { useTransakController } from '../../hooks/useTransakController';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import {
  isMicaMockModeEnabled,
  mockSubmitSourceOfIncome,
  EEA_COUNTRIES,
} from '../../utils/micaMockMode';
import { parseUserFacingError } from '../../utils/parseUserFacingError';
import DepositTextField from '../../components/DepositTextField';
import DepositSelectField from '../../components/DepositSelectField/DepositSelectField';
import { useRampsUserRegion } from '../../hooks/useRampsUserRegion';
import styleSheet from './SourceOfIncome.styles';
import DepositProgressBar from '../../components/DepositProgressBar';
import PrivacySection from '../../components/PrivacySection';

interface SourceOfIncomeMetadata
  extends NonNullable<TransakAdditionalRequirement['metadata']> {
  sourceOfFundsTypeOptions?: { name: string; value: string }[];
  employmentStatusOptions?: { name: string; value: string }[];
  countryOfCitizenshipOptions?: { name: string; value: string }[];
}

export interface SourceOfIncomeParams {
  quote: TransakBuyQuote;
  metadata: SourceOfIncomeMetadata;
  /** Optional callback to continue KYC flow (for testing or direct navigation) */
  onSourceOfIncomeSubmitted?: () => void;
  headlessSessionId?: string;
}

const SourceOfIncome = (): React.JSX.Element => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const navigation = useNavigation<AppNavigationProp>();
  const { styles } = useStyles(styleSheet, {});
  const { quote, metadata, onSourceOfIncomeSubmitted, headlessSessionId } =
    useParams<SourceOfIncomeParams>();
  const {
    submitSourceOfIncome: submitSourceOfIncomeController,
    getUserDetails,
    getAdditionalRequirements,
  } = useTransakController();
  const { routeAfterAuthentication } = useTransakRouting({
    screenLocation: 'SourceOfIncome Screen',
  });
  const { userRegion } = useRampsUserRegion();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [monthlyVolume, setMonthlyVolume] = useState('');
  const [sourceOfFundsType, setSourceOfFundsType] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('');
  const [countryOfCitizenship, setCountryOfCitizenship] = useState('');
  const [addressCountryCode, setAddressCountryCode] = useState<string>('');
  const [userDetailsLoading, setUserDetailsLoading] = useState(true);
  const [currentMetadata, setCurrentMetadata] =
    useState<SourceOfIncomeMetadata>(metadata);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const details = await getUserDetails();
        setAddressCountryCode(details?.address?.countryCode || '');
      } catch (err) {
        Logger.error(
          err as Error,
          'SourceOfIncome: Failed to fetch user details',
        );
      } finally {
        setUserDetailsLoading(false);
      }
    };
    fetchUserDetails();
  }, [getUserDetails]);

  useEffect(() => {
    if (hasEEAFieldsMissing && !retrying) {
      const timer = setTimeout(() => {
        Logger.log(
          'SourceOfIncome: Auto-retrying requirements fetch for EEA user with missing options',
        );
        handleRetryFetchRequirements();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [hasEEAFieldsMissing, retrying, handleRetryFetchRequirements]);

  const regionIsoCode = userRegion?.country?.isoCode || '';
  const effectiveCountryCode = addressCountryCode || regionIsoCode;
  const isEEA = EEA_COUNTRIES.includes(effectiveCountryCode.toUpperCase());

  const sourceOfFundsOptions: { name: string; value: string }[] =
    currentMetadata.sourceOfFundsTypeOptions || [];
  const employmentStatusOptions: { name: string; value: string }[] =
    currentMetadata.employmentStatusOptions || [];
  const countryOfCitizenshipOptions: { name: string; value: string }[] =
    currentMetadata.countryOfCitizenshipOptions || [];

  const hasEEAFieldsMissing =
    isEEA &&
    !userDetailsLoading &&
    (!employmentStatusOptions.length || !countryOfCitizenshipOptions.length);

  const handleRetryFetchRequirements = useCallback(async () => {
    setRetrying(true);
    setError(null);
    try {
      const freshRequirements = await getAdditionalRequirements(quote.quoteId);
      const sourceOfIncomeForm = freshRequirements?.formsRequired?.find(
        (f) => f.type === 'SOURCE_OF_INCOME',
      );
      if (sourceOfIncomeForm?.metadata) {
        setCurrentMetadata({
          options: [],
          documentProofOptions: [],
          expiresAt: '',
          kycUrl: '',
          workFlowRunId: '',
          ...sourceOfIncomeForm.metadata,
        });
      }
    } catch (err) {
      Logger.error(
        err as Error,
        'SourceOfIncome: Failed to retry fetch requirements',
      );
      setError(
        parseUserFacingError(
          err,
          strings('deposit.source_of_income.fetch_error'),
        ),
      );
    } finally {
      setRetrying(false);
    }
  }, [getAdditionalRequirements, quote.quoteId]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    navigation.getParent()?.pop();
  }, [navigation]);

  const handleSubmit = useCallback(async () => {
    setError(null);

    // Validation
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
    if (isEEA && !employmentStatus) {
      setError(strings('deposit.mica.employmentStatusRequired'));
      return;
    }
    if (isEEA && !countryOfCitizenship) {
      setError(strings('deposit.mica.nationalityRequired'));
      return;
    }

    setLoading(true);

    try {
      const requestData = {
        monthlyVolume,
        sourceOfFundsType,
        ...(isEEA && { employmentStatus, countryOfCitizenship }),
      };

      let result;
      if (isMicaMockModeEnabled()) {
        result = await mockSubmitSourceOfIncome(requestData);
      } else {
        result = await submitSourceOfIncomeController(
          monthlyVolume,
          sourceOfFundsType,
          employmentStatus,
          countryOfCitizenship,
        );
      }

      if (result.status === 'FAILED') {
        setError(strings('deposit.mica.sourceOfIncomeSubmitError'));
        return;
      }

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
    employmentStatus,
    countryOfCitizenship,
    isEEA,
    onSourceOfIncomeSubmitted,
    quote,
    routeAfterAuthentication,
    submitSourceOfIncomeController,
  ]);

  const isFormValid =
    monthlyVolume &&
    sourceOfFundsType &&
    (!isEEA || (employmentStatus && countryOfCitizenship)) &&
    !hasEEAFieldsMissing;

  if (isMicaMockModeEnabled()) {
    Logger.log('[MiCA Mock] SourceOfIncome screen rendered in mock mode', {
      isEEA,
    });
  }

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
            <DepositProgressBar currentStep={4} totalSteps={5} />

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
            {hasEEAFieldsMissing && !error && (
              <BannerAlert
                severity={BannerAlertSeverity.Error}
                title={strings('deposit.source_of_income.eea_fields_missing_title')}
                description={strings(
                  'deposit.source_of_income.eea_fields_missing_description',
                )}
                actionButtonProps={{
                  variant: ButtonVariants.Link,
                  label: strings('deposit.source_of_income.retry_button'),
                  onPress: handleRetryFetchRequirements,
                  disabled: retrying,
                }}
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
                prefix="€"
                caption={strings('deposit.source_of_income.monthly_volume_helper')}
              />
            </View>

            <View style={styles.section}>
              <DepositSelectField
                label={strings('deposit.source_of_income.source_of_funds_label')}
                placeholder={strings(
                  'deposit.source_of_income.source_of_funds_placeholder',
                )}
                options={sourceOfFundsOptions}
                selectedValue={sourceOfFundsType}
                onValueChange={setSourceOfFundsType}
              />
            </View>

            {isEEA && (
              <>
                <View style={styles.section}>
                  <DepositSelectField
                    label={strings(
                      'deposit.source_of_income.employment_status_label',
                    )}
                    placeholder={strings(
                      'deposit.source_of_income.employment_status_placeholder',
                    )}
                    options={employmentStatusOptions}
                    selectedValue={employmentStatus}
                    onValueChange={setEmploymentStatus}
                  />
                </View>

                <View style={styles.section}>
                  <DepositSelectField
                    label={strings('deposit.source_of_income.nationality_label')}
                    placeholder={strings(
                      'deposit.source_of_income.nationality_placeholder',
                    )}
                    options={countryOfCitizenshipOptions}
                    selectedValue={countryOfCitizenship}
                    onValueChange={setCountryOfCitizenship}
                  />
                </View>
              </>
            )}
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
