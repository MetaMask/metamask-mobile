import React, { useMemo } from 'react';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import {
  useIsTransactionPayLoading,
  useTransactionPayTotals,
} from '../../../hooks/pay/useTransactionPayData';
import AlertRow from '../../UI/info-row/alert-row';
import { strings } from '../../../../../../../locales/i18n';
import { RowAlertKey } from '../../UI/info-row/alert-row/constants';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useAlerts } from '../../../context/alert-system-context';
import { ConfirmationRowComponentIDs } from '../../../ConfirmationView.testIds';
import { BigNumber } from 'bignumber.js';
import { InfoRowSkeleton, InfoRowVariant } from '../../UI/info-row/info-row';
import { IconColor } from '../../../../../../component-library/components/Icons/Icon';

export function NetworkFeeRow() {
  const isLoading = useIsTransactionPayLoading();

  const totals = useTransactionPayTotals();

  const formatFiat = useFiatFormatter({ currency: 'usd' });

  const { fieldAlerts } = useAlerts();

  const hasAlert = fieldAlerts.some((a) => a.field === RowAlertKey.PayWithFee);

  const networkFeeUsd = useMemo(() => {
    const sourceNetworkUsd = totals?.fees?.sourceNetwork?.estimate?.usd;
    const targetNetworkUsd = totals?.fees?.targetNetwork?.usd;

    if (sourceNetworkUsd == null || targetNetworkUsd == null) return '';

    return formatFiat(new BigNumber(sourceNetworkUsd).plus(targetNetworkUsd));
  }, [totals, formatFiat]);

  if (isLoading) {
    return <InfoRowSkeleton testId="network-fee-row-skeleton" />;
  }

  return (
    <AlertRow
      testID="network-fee-row"
      label={strings('confirm.label.network_fee')}
      alertField={RowAlertKey.PayWithFee}
      tooltipTitle={strings('confirm.label.network_fee')}
      tooltip={strings('confirm.tooltip.network_fee')}
      tooltipColor={IconColor.Alternative}
      rowVariant={InfoRowVariant.Small}
    >
      <Text
        variant={TextVariant.BodyMD}
        color={hasAlert ? TextColor.Error : TextColor.Alternative}
        testID={ConfirmationRowComponentIDs.NETWORK_FEE}
      >
        {networkFeeUsd}
      </Text>
    </AlertRow>
  );
}
