import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import InfoRow from '../../UI/info-row';
import { MUSD_CONVERSION_APY } from '../../../../../UI/Earn/constants/musd';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { useIsTransactionPayLoading } from '../../../hooks/pay/useTransactionPayData';
import { InfoRowSkeleton, InfoRowVariant } from '../../UI/info-row/info-row';
import { strings } from '../../../../../../../locales/i18n';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import Routes from '../../../../../../constants/navigation/Routes';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { TransactionType } from '@metamask/transaction-controller';
import { hasTransactionType } from '../../../utils/transaction';

const styles = StyleSheet.create({
  tooltipButton: {
    marginLeft: 4,
  },
});

export function PercentageRow() {
  const isLoading = useIsTransactionPayLoading();
  const navigation = useNavigation();
  const transactionMetadata = useTransactionMetadataRequest();

  if (
    !hasTransactionType(transactionMetadata, [TransactionType.musdConversion])
  ) {
    return null;
  }

  const handleInfoPress = () => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.CLAIMABLE_BONUS_INFO_SHEET,
    });
  };

  if (isLoading) {
    return <InfoRowSkeleton testId="percentage-row-skeleton" />;
  }

  return (
    <InfoRow
      label={strings('earn.claimable_bonus')}
      rowVariant={InfoRowVariant.Small}
      labelChildren={
        <TouchableOpacity
          onPress={handleInfoPress}
          testID="percentage-row-tooltip-open-btn"
          style={styles.tooltipButton}
          hitSlop={8}
        >
          <Icon
            name={IconName.Info}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
          />
        </TouchableOpacity>
      }
    >
      <Text variant={TextVariant.BodyMD} color={TextColor.Success}>
        {MUSD_CONVERSION_APY}%
      </Text>
    </InfoRow>
  );
}
