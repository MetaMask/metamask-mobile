/**
 * Collects source of funds, monthly volume, employment status, and nationality
 * for EEA users per MiCA requirements.
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
  const { submitSourceOfIncome: submitSourceOfIncomeController } =
    useTransakController();
  const { routeAfterAuthentication } = useTransakRouting({
    screenLocation: 'SourceOfIncome Screen',
  });
  const { userRegion } = useRampsUserRegion();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthlyVolume, setMonthlyVolume] = useState('');
  const [sourceOfFundsType, setSourceOfFundsType] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('');
  const [countryOfCitizenship, setCountryOfCitizenship] = useState('');

  const regionIsoCode = userRegion?.country?.isoCode || '';
  const isEEA = EEA_COUNTRIES.includes(regionIsoCode.toUpperCase());

  const sourceOfFundsOptions: { name: string; value: string }[] =
    metadata.sourceOfFundsTypeOptions || [];

  const employmentStatusOptions: { name: string; value: string }[] = metadata
    .employmentStatusOptions?.length
    ? metadata.employmentStatusOptions
    : [
        { name: 'Student', value: 'student' },
        { name: 'Retired', value: 'retired' },
        { name: 'Unemployed', value: 'unemployed' },
        { name: 'Self Employed', value: 'self_employed' },
        {
          name: 'Junior/Entry-Level Employee',
          value: 'junior_entry_level_employee',
        },
        { name: 'Mid-Level Employee', value: 'mid_level_employee' },
        { name: 'Management Role', value: 'management_role' },
        { name: 'Executive Role', value: 'executive_role' },
      ];

  const countryOfCitizenshipOptions: { name: string; value: string }[] =
    metadata.countryOfCitizenshipOptions?.length
      ? metadata.countryOfCitizenshipOptions
      : [
          { name: 'Austria', value: 'AT' },
          { name: 'Belgium', value: 'BE' },
          { name: 'Bulgaria', value: 'BG' },
          { name: 'Croatia', value: 'HR' },
          { name: 'Cyprus', value: 'CY' },
          { name: 'Czech Republic', value: 'CZ' },
          { name: 'Denmark', value: 'DK' },
          { name: 'Estonia', value: 'EE' },
          { name: 'Finland', value: 'FI' },
          { name: 'France', value: 'FR' },
          { name: 'Germany', value: 'DE' },
          { name: 'Greece', value: 'GR' },
          { name: 'Hungary', value: 'HU' },
          { name: 'Ireland', value: 'IE' },
          { name: 'Italy', value: 'IT' },
          { name: 'Latvia', value: 'LV' },
          { name: 'Lithuania', value: 'LT' },
          { name: 'Luxembourg', value: 'LU' },
          { name: 'Malta', value: 'MT' },
          { name: 'Netherlands', value: 'NL' },
          { name: 'Poland', value: 'PL' },
          { name: 'Portugal', value: 'PT' },
          { name: 'Romania', value: 'RO' },
          { name: 'Slovakia', value: 'SK' },
          { name: 'Slovenia', value: 'SI' },
          { name: 'Spain', value: 'ES' },
          { name: 'Sweden', value: 'SE' },
          { name: 'Iceland', value: 'IS' },
          { name: 'Liechtenstein', value: 'LI' },
          { name: 'Norway', value: 'NO' },
        ];

  const handleBack = useCallback(() => {
    navigation.goBack();
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
    (!isEEA || (employmentStatus && countryOfCitizenship));

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
          title={strings('deposit.mica.sourceOfIncomeTitle')}
          onBack={handleBack}
          includesTopInset
        />
        <KeyboardAwareScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          enableAutomaticScroll
        >
          <ScreenLayout.Content>
            <View style={styles.section}>
              <Text variant={TextVariant.BodyMd} style={styles.description}>
                {strings('deposit.mica.sourceOfIncomeDescription')}
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
                label={strings('deposit.mica.monthlyVolumeLabel')}
                placeholder={strings('deposit.mica.monthlyVolumePlaceholder')}
                value={monthlyVolume}
                onChangeText={setMonthlyVolume}
                keyboardType="numeric"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.section}>
              <DepositSelectField
                label={strings('deposit.mica.sourceOfFundsLabel')}
                placeholder={strings('deposit.mica.sourceOfFundsPlaceholder')}
                options={sourceOfFundsOptions}
                selectedValue={sourceOfFundsType}
                onValueChange={setSourceOfFundsType}
              />
            </View>

            {isEEA && (
              <>
                <View style={styles.section}>
                  <DepositSelectField
                    label={strings('deposit.mica.employmentStatusLabel')}
                    placeholder={strings(
                      'deposit.mica.employmentStatusPlaceholder',
                    )}
                    options={employmentStatusOptions}
                    selectedValue={employmentStatus}
                    onValueChange={setEmploymentStatus}
                  />
                </View>

                <View style={styles.section}>
                  <DepositSelectField
                    label={strings('deposit.mica.nationalityLabel')}
                    placeholder={strings('deposit.mica.nationalityPlaceholder')}
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
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={handleSubmit}
            isLoading={loading}
            isDisabled={!isFormValid || loading}
            isFullWidth
          >
            {strings('deposit.mica.submitButton')}
          </Button>
          <PoweredByTransak name="powered-by-transak-logo" />
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default SourceOfIncome;
