import React from 'react';
import { StyleSheet, Linking } from 'react-native';
import InfoRow from '../../UI/info-row';
import { MUSD_CONVERSION_APY } from '../../../../../UI/Earn/constants/musd';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { useIsTransactionPayLoading } from '../../../hooks/pay/useTransactionPayData';
import { InfoRowSkeleton } from '../../UI/info-row/info-row';
import { strings } from '../../../../../../../locales/i18n';
import { IconColor } from '../../../../../../component-library/components/Icons/Icon';
import AppConstants from '../../../../../../core/AppConstants';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { TransactionType } from '@metamask/transaction-controller';
import { hasTransactionType } from '../../../utils/transaction';

const styles = StyleSheet.create({
  termsText: {
    textDecorationLine: 'underline',
  },
});

export function PercentageRow() {
  const isLoading = useIsTransactionPayLoading();

  const transactionMetadata = useTransactionMetadataRequest();

  if (
    !hasTransactionType(transactionMetadata, [TransactionType.musdConversion])
  ) {
    return null;
  }

  const redirectToBonusFaq = () =>
    Linking.openURL(AppConstants.URLS.MUSD_CONVERSION_BONUS_TERMS_OF_USE);

  if (isLoading) {
    return <InfoRowSkeleton testId="percentage-row-skeleton" />;
  }

  return (
    <InfoRow
      label={strings('earn.claimable_bonus')}
      tooltip={
        <Text>
          {strings('earn.claimable_bonus_tooltip')}{' '}
          <Text style={styles.termsText} onPress={redirectToBonusFaq}>
            {strings('earn.musd_conversion.education.terms_apply')}
          </Text>
        </Text>
      }
      tooltipColor={IconColor.Muted}
    >
      <Text variant={TextVariant.BodyMD} color={TextColor.Success}>
        {MUSD_CONVERSION_APY}%
      </Text>
    </InfoRow>
  );
}
