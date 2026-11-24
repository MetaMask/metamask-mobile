/**
 * Collects source of funds and monthly volume for MiCA SOURCE_OF_INCOME form.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  Text,
  TextVariant,
  Label,
  TextField,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../hooks/useStyles';
import { useParams } from '../../../../../util/navigation/navUtils';
import { strings } from '../../../../../../locales/i18n';
import { useFormatters } from '../../../../hooks/useFormatters';
import type {
  TransakAdditionalRequirement,
  TransakBuyQuote,
} from '@metamask/ramps-controller';
import { useTransakController } from '../../hooks/useTransakController';
import { useMicaFormRetry } from '../../hooks/useMicaFormRetry';
import { useMicaSubmit } from '../../hooks/useMicaSubmit';
import OptionSelectField from './components/OptionSelectField';
import styleSheet from './SourceOfIncome.styles';
import { KYC_STEP } from '../../utils/kycProgress';
import MicaKycFormLayout from './MicaKycFormLayout';

type SourceOfIncomeMetadata = NonNullable<
  TransakAdditionalRequirement['metadata']
>;

export interface SourceOfIncomeParams {
  quote: TransakBuyQuote;
  quoteId: string;
  metadata: SourceOfIncomeMetadata;
  headlessSessionId?: string;
}

const SourceOfIncome = (): React.JSX.Element => {
  const { styles, theme } = useStyles(styleSheet, {});
  const { quote, quoteId, metadata, headlessSessionId } =
    useParams<SourceOfIncomeParams>();
  const {
    submitSourceOfIncome: submitSourceOfIncomeController,
    getKycRequirement,
    getAdditionalRequirements,
  } = useTransakController();
  const { loading, error, setError, submit } = useMicaSubmit({
    screenLocation: 'SourceOfIncome Screen',
    quote,
    quoteId,
    headlessSessionId,
    getKycRequirement,
    getAdditionalRequirements,
    submitError: strings('deposit.mica.sourceOfIncomeSubmitError'),
    logContext: 'SourceOfIncome',
  });
  const { formatCurrency } = useFormatters();

  const currencySymbol = useMemo(() => {
    if (!quote?.fiatCurrency) return '';
    // Format a zero amount and keep only the symbol (e.g. "€0.00" -> "€").
    return formatCurrency(0, quote.fiatCurrency, {
      currencyDisplay: 'narrowSymbol',
    }).replace(/[0-9.,\s\u00A0]/g, '');
  }, [formatCurrency, quote?.fiatCurrency]);

  const [monthlyVolume, setMonthlyVolume] = useState('');
  const [sourceOfFundsType, setSourceOfFundsType] = useState('');

  const sourceOfFundsOptions: { name: string; value: string }[] =
    metadata.sourceOfFundsTypeOptions ?? [];
  const hasFieldsMissing = !sourceOfFundsOptions.length;

  const { retrying, retry } = useMicaFormRetry({
    formType: 'SOURCE_OF_INCOME',
    quote,
    quoteId,
    headlessSessionId,
    getAdditionalRequirements,
    setError,
    fallbackError: strings('deposit.source_of_income.fetch_error'),
    logContext: 'SourceOfIncome',
  });

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

    await submit(async () =>
      submitSourceOfIncomeController(monthlyVolume, sourceOfFundsType),
    );
  }, [
    monthlyVolume,
    sourceOfFundsType,
    setError,
    submit,
    submitSourceOfIncomeController,
  ]);

  const isFormValid = monthlyVolume && sourceOfFundsType;

  return (
    <MicaKycFormLayout
      headerTitle={strings('deposit.source_of_income.header_title')}
      title={strings('deposit.source_of_income.title')}
      subtitle={strings('deposit.source_of_income.subtitle')}
      step={KYC_STEP.SOURCE_OF_INCOME}
      error={error}
      missingFields={
        hasFieldsMissing
          ? {
              title: strings('deposit.source_of_income.fields_missing_title'),
              description: strings(
                'deposit.source_of_income.source_of_funds_missing_description',
              ),
              retryLabel: strings('deposit.source_of_income.retry_button'),
              retrying,
              onRetry: retry,
            }
          : undefined
      }
      loading={loading}
      isSubmitDisabled={!isFormValid}
      onSubmit={handleSubmit}
    >
      <View>
        <Label style={styles.fieldLabel}>
          {strings('deposit.source_of_income.monthly_volume_label')}
        </Label>
        <TextField
          testID="source-of-income-monthly-volume-input"
          value={monthlyVolume}
          onChangeText={setMonthlyVolume}
          placeholder={strings(
            'deposit.source_of_income.monthly_volume_placeholder',
          )}
          startAccessory={
            currencySymbol ? (
              <Text variant={TextVariant.BodyMd}>{currencySymbol}</Text>
            ) : undefined
          }
          inputProps={{
            keyboardType: 'numeric',
            autoCapitalize: 'none',
            keyboardAppearance: theme.themeAppearance,
            accessibilityLabel: strings(
              'deposit.source_of_income.monthly_volume_label',
            ),
          }}
        />
      </View>

      <OptionSelectField
        label={strings('deposit.source_of_income.source_of_funds_label')}
        placeholder={strings(
          'deposit.source_of_income.source_of_funds_placeholder',
        )}
        options={sourceOfFundsOptions}
        selectedValue={sourceOfFundsType}
        onValueChange={setSourceOfFundsType}
        testID="source-of-income-source-of-funds-select"
      />
    </MicaKycFormLayout>
  );
};

export default SourceOfIncome;
