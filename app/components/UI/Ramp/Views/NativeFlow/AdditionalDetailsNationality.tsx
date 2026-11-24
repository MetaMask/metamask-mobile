/**
 * Collects employment status and nationality for EEA users per MiCA requirements.
 * This is the ADDITIONAL_DETAILS_NATIONALITY form that appears after SOURCE_OF_INCOME.
 */

import React, { useCallback, useState } from 'react';
import { useParams } from '../../../../../util/navigation/navUtils';
import { strings } from '../../../../../../locales/i18n';
import type {
  TransakAdditionalRequirement,
  TransakBuyQuote,
} from '@metamask/ramps-controller';
import { useTransakController } from '../../hooks/useTransakController';
import { useMicaFormRetry } from '../../hooks/useMicaFormRetry';
import { useMicaSubmit } from '../../hooks/useMicaSubmit';
import OptionSelectField from './components/OptionSelectField';
import { KYC_STEP } from '../../utils/kycProgress';
import MicaKycFormLayout from './MicaKycFormLayout';

interface AdditionalDetailsNationalityMetadata
  extends NonNullable<TransakAdditionalRequirement['metadata']> {
  employmentStatusOptions?: { name: string; value: string }[];
  countryOfCitizenshipOptions?: { name: string; value: string }[];
}

export interface AdditionalDetailsNationalityParams {
  quote: TransakBuyQuote;
  quoteId: string;
  metadata: AdditionalDetailsNationalityMetadata;
  headlessSessionId?: string;
}

const AdditionalDetailsNationality = (): React.JSX.Element => {
  const { quote, quoteId, metadata, headlessSessionId } =
    useParams<AdditionalDetailsNationalityParams>();
  const {
    submitAdditionalDetailsNationality,
    getKycRequirement,
    getAdditionalRequirements,
  } = useTransakController();
  const { loading, error, setError, submit } = useMicaSubmit({
    screenLocation: 'AdditionalDetailsNationality Screen',
    quote,
    quoteId,
    headlessSessionId,
    getKycRequirement,
    getAdditionalRequirements,
    submitError: strings('deposit.additional_details_nationality.submitError'),
    logContext: 'AdditionalDetailsNationality',
  });

  const [employmentStatus, setEmploymentStatus] = useState('');
  const [countryOfCitizenship, setCountryOfCitizenship] = useState('');

  const employmentStatusOptions: { name: string; value: string }[] =
    metadata.employmentStatusOptions ?? [];
  const countryOfCitizenshipOptions: { name: string; value: string }[] =
    metadata.countryOfCitizenshipOptions ?? [];

  const hasFieldsMissing =
    !employmentStatusOptions.length || !countryOfCitizenshipOptions.length;

  const { retrying, retry } = useMicaFormRetry({
    formType: 'ADDITIONAL_DETAILS_NATIONALITY',
    quote,
    quoteId,
    headlessSessionId,
    getAdditionalRequirements,
    setError,
    fallbackError: strings(
      'deposit.additional_details_nationality.fetch_error',
    ),
    logContext: 'AdditionalDetailsNationality',
  });

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

    await submit(async () =>
      submitAdditionalDetailsNationality(
        employmentStatus,
        countryOfCitizenship,
      ),
    );
  }, [
    employmentStatus,
    countryOfCitizenship,
    setError,
    submit,
    submitAdditionalDetailsNationality,
  ]);

  const isFormValid =
    employmentStatus && countryOfCitizenship && !hasFieldsMissing;

  return (
    <MicaKycFormLayout
      headerTitle={strings(
        'deposit.additional_details_nationality.header_title',
      )}
      title={strings('deposit.additional_details_nationality.title')}
      subtitle={strings('deposit.additional_details_nationality.subtitle')}
      step={KYC_STEP.NATIONALITY}
      error={error}
      missingFields={
        hasFieldsMissing
          ? {
              title: strings(
                'deposit.additional_details_nationality.fields_missing_title',
              ),
              description: strings(
                'deposit.additional_details_nationality.fields_missing_description',
              ),
              retryLabel: strings(
                'deposit.additional_details_nationality.retry_button',
              ),
              retrying,
              onRetry: retry,
            }
          : undefined
      }
      loading={loading}
      isSubmitDisabled={!isFormValid}
      onSubmit={handleSubmit}
    >
      <OptionSelectField
        label={strings('deposit.source_of_income.employment_status_label')}
        placeholder={strings(
          'deposit.source_of_income.employment_status_placeholder',
        )}
        options={employmentStatusOptions}
        selectedValue={employmentStatus}
        onValueChange={setEmploymentStatus}
        testID="nationality-employment-status-select"
      />

      <OptionSelectField
        label={strings('deposit.source_of_income.nationality_label')}
        placeholder={strings(
          'deposit.source_of_income.nationality_placeholder',
        )}
        options={countryOfCitizenshipOptions}
        selectedValue={countryOfCitizenship}
        onValueChange={setCountryOfCitizenship}
        testID="nationality-country-of-citizenship-select"
      />
    </MicaKycFormLayout>
  );
};

export default AdditionalDetailsNationality;
