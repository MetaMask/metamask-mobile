import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import { navigateWithDetails } from '../../../../../../util/navigation/navUtils';
import { TransactionMeta } from '@metamask/transaction-controller';

import { IconName } from '../../../../../../component-library/components/Icons/Icon';
import Routes from '../../../../../../constants/navigation/Routes';
import I18n, { strings } from '../../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../../util/intl';
import { ProgressListItem } from '../../progress-list';
import { useFiatOrderStatus } from '../../../hooks/activity/useFiatOrderStatus';

export function FiatOrderSummaryLine({
  parentTransaction,
}: {
  parentTransaction: TransactionMeta;
}) {
  const navigation = useNavigation<AppNavigationProp>();
  const { fiat } = parentTransaction.metamaskPay ?? {};
  const fiatOrderId = fiat?.orderId;
  const fiatProvider = fiat?.provider;
  const walletAddress = parentTransaction.txParams.from;

  const { severity, statusText, cryptoSymbol, paymentMethodName } =
    useFiatOrderStatus(
      fiatOrderId,
      fiatProvider,
      walletAddress,
      parentTransaction.status,
    );

  const title =
    cryptoSymbol && paymentMethodName
      ? strings('transaction_details.summary_title.fiat_purchase', {
          token: cryptoSymbol,
          paymentMethod: paymentMethodName,
        })
      : strings('transaction_details.summary_title.fiat_purchase', {
          token: '...',
          paymentMethod: '...',
        });

  const subtitle = formatSubtitle(parentTransaction.time, statusText);

  const handleOrderDetailsPress = useCallback(() => {
    // FiatOrderSummaryLine renders inside MoneyModalStack (a transparent modal
    // nested navigator). useNavigation<AppNavigationProp>() returns the ModalStack navigator, which
    // doesn't know about RAMPS_ORDER_DETAILS. We must escape to the root Stack
    // navigator via getParent() to reach it.
    const rootNav = navigation.getParent() ?? navigation;
    // Escaping to the root Stack to reach the Ramp-owned RampsOrderDetails
    // screen nested under TransactionsView; that param list is typed by the
    // Ramp feature, so we can't validate the nested payload here.
    navigateWithDetails(rootNav, [
      Routes.TRANSACTIONS_VIEW,
      {
        screen: Routes.RAMP.RAMPS_ORDER_DETAILS,
        params: { orderId: fiatOrderId, showCloseButton: true },
      },
    ]);
  }, [navigation, fiatOrderId]);

  return (
    <ProgressListItem
      title={title}
      subtitle={subtitle}
      severity={severity}
      buttonIcon={fiatOrderId ? IconName.Export : undefined}
      onButtonPress={fiatOrderId ? handleOrderDetailsPress : undefined}
    />
  );
}

function formatSubtitle(timestamp: number, statusText: string): string {
  const date = new Date(timestamp);

  const timeString = getIntlDateTimeFormatter(I18n.locale, {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(date);

  const month = getIntlDateTimeFormatter(I18n.locale, {
    month: 'short',
  }).format(date);

  const dateString = `${month} ${date.getDate()}, ${date.getFullYear()}`;

  return `${statusText} • ${timeString} • ${dateString}`;
}
