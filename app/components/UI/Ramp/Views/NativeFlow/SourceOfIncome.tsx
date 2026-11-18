/**
 * Collects source of funds, monthly volume, employment status, and nationality
 * for EEA users per MiCA requirements.
 */

import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
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
import PoweredByTransak from '../../components/PoweredByTransak';
import Logger from '../../../../../util/Logger';
import BannerAlert from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import type { TransakBuyQuote } from '@metamask/ramps-controller';
import { useSelector } from 'react-redux';
import { useTransakController } from '../../hooks/useTransakController';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import {
  isMicaMockModeEnabled,
  mockSubmitSourceOfIncome,
} from '../../utils/micaMockMode';
import { parseUserFacingError } from '../../utils/parseUserFacingError';
import type { TransakSourceOfIncomeFormMetadata } from '../../types/micaTypes';
import DepositTextField from '../../components/DepositTextField';
import DepositSelectField from '../../components/DepositSelectField/DepositSelectField';
import styleSheet from './SourceOfIncome.styles';

export interface SourceOfIncomeParams {
  quote: TransakBuyQuote;
  metadata: TransakSourceOfIncomeFormMetadata;
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthlyVolume, setMonthlyVolume] = useState('');
  const [sourceOfFundsType, setSourceOfFundsType] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('');
  const [countryOfCitizenship, setCountryOfCitizenship] = useState('');

  // EEA users have employmentStatusOptions and countryOfCitizenshipOptions
  const isEEA =
    Boolean(metadata.employmentStatusOptions?.length) &&
    Boolean(metadata.countryOfCitizenshipOptions?.length);

  const sourceOfFundsOptions =
    metadata.sourceOfFundsTypeOptions || metadata.options || [];

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSubmit = useCallback(async () => {
    setError(null);

    // Validation
    if (!monthlyVolume || Number.isNaN(Number(monthlyVolume)) || Number(monthlyVolume) <= 0) {
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

      // Mock mode or real submission
      if (isMicaMockModeEnabled()) {
        await mockSubmitSourceOfIncome(requestData);
      } else {
        // Real submission via controller (requires core PR integration)
        await submitSourceOfIncomeController(
          monthlyVolume,
          sourceOfFundsType,
          employmentStatus,
          countryOfCitizenship,
        );
      }

      // Navigate back or call the callback
      if (onSourceOfIncomeSubmitted) {
        onSourceOfIncomeSubmitted();
      } else {
        navigation.goBack();
      }
    } catch (err) {
      Logger.error(err as Error, 'SourceOfIncome: Failed to submit');
      setError(
        parseUserFacingError(err, strings('deposit.mica.sourceOfIncomeSubmitError')),
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
    navigation,
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
    <ScreenLayout
      title={strings('deposit.mica.sourceOfIncomeTitle')}
      handleBack={handleBack}
      HeaderComponent={isGlassHeader ? HeaderStandardGlass : undefined}
      showHelpButton={false}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text variant={TextVariant.BodyMD} style={styles.description}>
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
                placeholder={strings('deposit.mica.employmentStatusPlaceholder')}
                options={metadata.employmentStatusOptions || []}
                selectedValue={employmentStatus}
                onValueChange={setEmploymentStatus}
              />
            </View>

            <View style={styles.section}>
              <DepositSelectField
                label={strings('deposit.mica.nationalityLabel')}
                placeholder={strings('deposit.mica.nationalityPlaceholder')}
                options={metadata.countryOfCitizenshipOptions || []}
                selectedValue={countryOfCitizenship}
                onValueChange={setCountryOfCitizenship}
              />
            </View>
          </>
        )}

        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          label={strings('deposit.mica.submitButton')}
          onPress={handleSubmit}
          isLoading={loading}
          isDisabled={!isFormValid || loading}
          style={styles.button}
        />

        <PoweredByTransak style={styles.poweredBy} />
      </ScrollView>
    </ScreenLayout>
  );
};

export default SourceOfIncome;
