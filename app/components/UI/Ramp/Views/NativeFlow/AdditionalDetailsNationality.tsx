/**
 * Collects employment status and nationality for EEA users per MiCA requirements.
 * This is the ADDITIONAL_DETAILS_NATIONALITY form that appears after SOURCE_OF_INCOME.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useParams } from '../../../../../util/navigation/navUtils';
import { strings } from '../../../../../../locales/i18n';
import { useTransakRouting } from '../../hooks/useTransakRouting';
import Routes from '../../../../../constants/navigation/Routes';
import Logger from '../../../../../util/Logger';
import type {
  TransakAdditionalRequirement,
  TransakBuyQuote,
} from '@metamask/ramps-controller';
import { useTransakController } from '../../hooks/useTransakController';
import { useMicaFormRetry } from '../../hooks/useMicaFormRetry';
import { parseUserFacingError } from '../../utils/parseUserFacingError';
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
  /** Optional callback to continue KYC flow (for testing or direct navigation) */
  onSubmitted?: () => void;
  headlessSessionId?: string;
}

const AdditionalDetailsNationality = (): React.JSX.Element => {
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
