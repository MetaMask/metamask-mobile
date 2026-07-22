import React, { useState } from 'react';
import { StyleSheet, Linking } from 'react-native';
import { MUSD_CONVERSION_APY } from '../../../../../UI/Earn/constants/musd';
import {
  FontWeight,
  IconName,
  KeyValueRow,
  KeyValueRowVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useIsTransactionPayLoading } from '../../../hooks/pay/useTransactionPayData';
import { strings } from '../../../../../../../locales/i18n';
import { TooltipModal } from '../../UI/Tooltip/Tooltip';
import AppConstants from '../../../../../../core/AppConstants';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { TransactionType } from '@metamask/transaction-controller';
import { hasTransactionType } from '../../../utils/transaction';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { MUSD_EVENTS_CONSTANTS } from '../../../../../UI/Earn/constants/events';
import { KeyValueRowSkeleton } from '../key-value-row-skeleton';

const { EVENT_LOCATIONS } = MUSD_EVENTS_CONSTANTS;

const styles = StyleSheet.create({
  termsText: {
    textDecorationLine: 'underline',
  },
});

export function PercentageRow() {
  const isLoading = useIsTransactionPayLoading();
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);

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
    return <KeyValueRowSkeleton testID="percentage-row-skeleton" />;
  }

  return (
    <>
      <KeyValueRow
        testID="percentage-row"
        variant={KeyValueRowVariant.Summary}
        twClassName="pl-2"
        keyLabel={strings('earn.claimable_bonus')}
        keyEndButtonIconProps={{
          iconName: IconName.Info,
          onPress: () => setIsTooltipOpen(true),
          testID: 'info-row-tooltip-open-btn',
        }}
        value={
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.SuccessDefault}
          >
            {MUSD_CONVERSION_APY}%
          </Text>
        }
      />
      <TooltipModal
        open={isTooltipOpen}
        setOpen={setIsTooltipOpen}
        content={
          <Text>
            {strings('earn.claimable_bonus_tooltip')}{' '}
            <Text style={styles.termsText} onPress={redirectToBonusFaq}>
              {strings('earn.musd_conversion.education.terms_apply')}
            </Text>
          </Text>
        }
        title={strings('earn.claimable_bonus')}
      />
    </>
  );
}
