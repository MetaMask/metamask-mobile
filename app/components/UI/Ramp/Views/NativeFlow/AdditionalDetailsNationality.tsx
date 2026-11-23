/**
 * Collects employment status and nationality for EEA users per MiCA requirements.
 * This is the ADDITIONAL_DETAILS_NATIONALITY form that appears after SOURCE_OF_INCOME.
 */

import React, { useCallback, useMemo, useState } from 'react';
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
import Routes from '../../../../../constants/navigation/Routes';
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
import { parseUserFacingError } from '../../utils/parseUserFacingError';
import DepositSelectField from '../../components/DepositSelectField/DepositSelectField';
import styleSheet from './SourceOfIncome.styles';
import DepositProgressBar from '../../components/DepositProgressBar';
import { getKycProgress, KYC_STEP } from '../../utils/kycProgress';
import PrivacySection from '../../components/PrivacySection';

interface AdditionalDetailsNationalityMetadata
  extends NonNullable<TransakAdditionalRequirement['metadata']> {
  employmentStatusOptions?: { name: string; value: string }[];
  countryOfCitizenshipOptions?: { name: string; value: string }[];
}

export interface AdditionalDetailsNationalityParams {
  quote: TransakBuyQuote;
  quoteId: string;
  metadata: AdditionalDetailsNationalityMetadata;
  /** Optional callback to continue KYC flow (for testing or direct navigation) */
  onSubmitted?: () => void;
  headlessSessionId?: string;
}

const AdditionalDetailsNationality = (): React.JSX.Element => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled);
  const navigation = useNavigation<AppNavigationProp>();
  const { styles } = useStyles(styleSheet, {});
  const { quote, quoteId, metadata, onSubmitted, headlessSessionId } =
    useParams<AdditionalDetailsNationalityParams>();
  const {
    submitAdditionalDetailsNationality,
    getKycRequirement,
    getAdditionalRequirements,
  } = useTransakController();
  // For headless buy flows, post-auth resets must land back on the Host
  // (which carries the live `headlessSessionId`) instead of BuildQuote.
  const transakRoutingConfig = useMemo(
    () => ({
      screenLocation: 'AdditionalDetailsNationality Screen',
      ...(headlessSessionId
        ? {
            baseRoute: Routes.RAMP.HEADLESS_HOST,
            baseRouteParams: { headlessSessionId },
          }
        : {}),
    }),
    [headlessSessionId],
  );
  const { routeAfterAuthentication } = useTransakRouting(transakRoutingConfig);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [employmentStatus, setEmploymentStatus] = useState('');
  const [countryOfCitizenship, setCountryOfCitizenship] = useState('');

  const employmentStatusOptions: { name: string; value: string }[] =
    metadata.employmentStatusOptions ?? [];
  const countryOfCitizenshipOptions: { name: string; value: string }[] =
    metadata.countryOfCitizenshipOptions ?? [];

  const hasFieldsMissing =
    !employmentStatusOptions.length || !countryOfCitizenshipOptions.length;

  const handleRetryFetchRequirements = useCallback(async () => {
    setRetrying(true);
    setError(null);
    try {
      const freshRequirements = await getAdditionalRequirements(quoteId);
      const form = freshRequirements?.formsRequired?.find(
        (f) => f.type === 'ADDITIONAL_DETAILS_NATIONALITY',
      );
      if (form?.metadata) {
        navigation.navigate(Routes.RAMP.ADDITIONAL_DETAILS_NATIONALITY, {
          quote,
          quoteId,
          metadata: form.metadata,
          ...(headlessSessionId ? { headlessSessionId } : {}),
        });
      }
    } catch (err) {
      Logger.error(
        err as Error,
        'AdditionalDetailsNationality: Failed to retry fetch requirements',
      );
      setError(
        parseUserFacingError(
          err,
          strings('deposit.additional_details_nationality.fetch_error'),
        ),
      );
    } finally {
      setRetrying(false);
    }
  }, [
    getAdditionalRequirements,
    quoteId,
    navigation,
    quote,
    headlessSessionId,
  ]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSubmit = useCallback(async () => {
    setError(null);

    if (!employmentStatus) {
      setError(strings('deposit.mica.employmentStatusRequired'));
      return;
    }
    if (!countryOfCitizenship) {
      setError(strings('deposit.mica.nationalityRequired'));
      return;
    }

    setLoading(true);

    try {
      const result = await submitAdditionalDetailsNationality(
        employmentStatus,
        countryOfCitizenship,
      );

      if (result.status === 'FAILED') {
        setError(strings('deposit.additional_details_nationality.submitError'));
        return;
      }

      await getKycRequirement(quoteId);
      await getAdditionalRequirements(quoteId);

      if (onSubmitted) {
        onSubmitted();
      } else {
        await routeAfterAuthentication(quote);
      }
    } catch (err) {
      Logger.error(
        err as Error,
        'AdditionalDetailsNationality: Failed to submit',
      );
      setError(
        parseUserFacingError(
          err,
          strings('deposit.additional_details_nationality.submitError'),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [
    employmentStatus,
    countryOfCitizenship,
    quoteId,
    getKycRequirement,
    getAdditionalRequirements,
    onSubmitted,
    quote,
    routeAfterAuthentication,
    submitAdditionalDetailsNationality,
  ]);

  const isFormValid =
    employmentStatus && countryOfCitizenship && !hasFieldsMissing;

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <HeaderStandardGlass
          isGlass={isGlassHeader}
          isFloating={false}
          title={strings('deposit.additional_details_nationality.header_title')}
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
            <DepositProgressBar
              {...getKycProgress(KYC_STEP.NATIONALITY, true)}
            />

            <View style={styles.section}>
              <Text variant={TextVariant.HeadingMd} style={styles.title}>
                {strings('deposit.additional_details_nationality.title')}
              </Text>
              <Text variant={TextVariant.BodyMd} style={styles.subtitle}>
                {strings('deposit.additional_details_nationality.subtitle')}
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

            {hasFieldsMissing && !error && (
              <BannerAlert
                severity={BannerAlertSeverity.Error}
                title={strings(
                  'deposit.additional_details_nationality.fields_missing_title',
                )}
                description={strings(
                  'deposit.additional_details_nationality.fields_missing_description',
                )}
                actionButtonProps={{
                  variant: ButtonVariants.Link,
                  label: strings(
                    'deposit.additional_details_nationality.retry_button',
                  ),
                  onPress: () => {
                    void handleRetryFetchRequirements();
                  },
                  disabled: retrying,
                }}
                style={styles.errorBanner}
              />
            )}

            <View style={styles.fields}>
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
                testID="nationality-employment-status-select"
              />

              <DepositSelectField
                label={strings('deposit.source_of_income.nationality_label')}
                placeholder={strings(
                  'deposit.source_of_income.nationality_placeholder',
                )}
                options={countryOfCitizenshipOptions}
                selectedValue={countryOfCitizenship}
                onValueChange={setCountryOfCitizenship}
                testID="nationality-country-of-citizenship-select"
              />
            </View>
          </ScreenLayout.Content>
        </KeyboardAwareScrollView>
      </ScreenLayout.Body>

      <ScreenLayout.Footer>
        <ScreenLayout.Content style={styles.footerContent}>
          <PrivacySection>
            <Text variant={TextVariant.BodySm}>
              {strings('deposit.source_of_income.privacy_text')}
            </Text>
          </PrivacySection>

          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={() => {
              void handleSubmit();
            }}
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

export default AdditionalDetailsNationality;
