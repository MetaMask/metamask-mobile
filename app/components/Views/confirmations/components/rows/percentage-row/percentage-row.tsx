import React, { useCallback } from 'react';
import { Linking, StyleSheet } from 'react-native';
import { TransactionType } from '@metamask/transaction-controller';
import InfoRow from '../../UI/info-row';
import { MUSD_CONVERSION_APY } from '../../../../../UI/Earn/constants/musd';
import { MUSD_EVENTS_CONSTANTS } from '../../../../../UI/Earn/constants/events';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { useIsTransactionPayLoading } from '../../../hooks/pay/useTransactionPayData';
import { InfoRowSkeleton, InfoRowVariant } from '../../UI/info-row/info-row';
import { strings } from '../../../../../../../locales/i18n';
import AppConstants from '../../../../../../core/AppConstants';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { hasTransactionType } from '../../../utils/transaction';

const { EVENT_LOCATIONS } = MUSD_EVENTS_CONSTANTS;

const styles = StyleSheet.create({
  termsLink: {
    textDecorationLine: 'underline',
  },
});

export function PercentageRow() {
  const isLoading = useIsTransactionPayLoading();
  const transactionMetadata = useTransactionMetadataRequest();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const handleTermsPress = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.MUSD_BONUS_TERMS_OF_USE_PRESSED)
        .addProperties({
          location: EVENT_LOCATIONS.PERCENTAGE_ROW,
          url: AppConstants.URLS.MUSD_CONVERSION_BONUS_TERMS_OF_USE,
        })
        .build(),
    );
    Linking.openURL(AppConstants.URLS.MUSD_CONVERSION_BONUS_TERMS_OF_USE);
  }, [createEventBuilder, trackEvent]);

  if (
    !hasTransactionType(transactionMetadata, [TransactionType.musdConversion])
  ) {
    return null;
  }

  if (isLoading) {
    return <InfoRowSkeleton testId="percentage-row-skeleton" />;
  }

  const tooltipContent = (
    <Text variant={TextVariant.BodyMD}>
      {strings('earn.claimable_bonus_tooltip')}{' '}
      <Text
        variant={TextVariant.BodyMD}
        style={styles.termsLink}
        onPress={handleTermsPress}
        testID="percentage-row-tooltip-terms-link"
      >
        {strings('earn.musd_conversion.education.terms_apply')}
      </Text>
    </Text>
  );

  return (
    <InfoRow
      label={strings('earn.claimable_bonus')}
      rowVariant={InfoRowVariant.Small}
      tooltip={tooltipContent}
      tooltipTitle={strings('earn.claimable_bonus')}
    >
      <Text variant={TextVariant.BodyMD} color={TextColor.Success}>
        {MUSD_CONVERSION_APY}%
      </Text>
    </InfoRow>
  );
}
