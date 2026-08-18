import React from 'react';
import { Linking } from 'react-native';
import { MUSD_CONVERSION_APY } from '../../../../../UI/Earn/constants/musd';
import {
  Text,
  TextButton,
  TextColor,
} from '@metamask/design-system-react-native';
import { useIsTransactionPayLoading } from '../../../hooks/pay/useTransactionPayData';
import { strings } from '../../../../../../../locales/i18n';
import AppConstants from '../../../../../../core/AppConstants';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { MUSD_EVENTS_CONSTANTS } from '../../../../../UI/Earn/constants/events';
import InfoRow, { InfoRowSkeleton } from '../../UI/info-row/info-row';
import { PercentageRowTestIds } from './percentage-row.testIds';

const { EVENT_LOCATIONS } = MUSD_EVENTS_CONSTANTS;

export function PercentageRow() {
  const isLoading = useIsTransactionPayLoading();

  const transactionMetadata = useTransactionMetadataRequest();

  const { trackEvent, createEventBuilder } = useAnalytics();

  if (
    !hasTransactionType(transactionMetadata, [TransactionType.musdConversion])
  ) {
    return null;
  }

  const redirectToBonusFaq = () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.MUSD_BONUS_TERMS_OF_USE_PRESSED)
        .addProperties({
          location: EVENT_LOCATIONS.PERCENTAGE_ROW,
          url: AppConstants.URLS.MUSD_CONVERSION_BONUS_TERMS_OF_USE,
        })
        .build(),
    );

    Linking.openURL(AppConstants.URLS.MUSD_CONVERSION_BONUS_TERMS_OF_USE);
  };

  if (isLoading) {
    return <InfoRowSkeleton testId="percentage-row-skeleton" />;
  }

  return (
    <InfoRow
      testID="percentage-row"
      label={strings('earn.claimable_bonus')}
      tooltip={
        <Text>
          {strings('earn.claimable_bonus_tooltip')}{' '}
          <TextButton
            testID={PercentageRowTestIds.TERMS_APPLY_BUTTON}
            onPress={redirectToBonusFaq}
          >
            {strings('earn.musd_conversion.education.terms_apply')}
          </TextButton>
        </Text>
      }
      valueTextProps={{
        color: TextColor.SuccessDefault,
      }}
    >
      {`${MUSD_CONVERSION_APY}%`}
    </InfoRow>
  );
}
