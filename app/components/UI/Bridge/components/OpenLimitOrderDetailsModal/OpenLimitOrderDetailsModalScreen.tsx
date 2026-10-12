import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useParams } from '../../../../../util/navigation/navUtils';
import { formatLimitOrderAmount } from '../../utils/limitOrders/formatLimitOrderAmount';
import { formatLimitOrderDate } from '../../utils/limitOrders/formatLimitOrderDate';
import { getLimitOrderTokens } from '../../utils/limitOrders/getLimitOrderTokens';
import { OpenLimitOrderDetailsModal } from './OpenLimitOrderDetailsModal';
import type { OpenLimitOrderDetailsModalParams } from './types';
import { getTriggerPrice } from './utils';

export const OpenLimitOrderDetailsModalScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { order } = useParams<OpenLimitOrderDetailsModalParams>();
  const { sourceToken, destinationToken } = getLimitOrderTokens(order);
  const { triggerPrice, triggerToken } = getTriggerPrice(
    order,
    sourceToken,
    destinationToken,
  );

  const handleCancelOrder = useCallback(() => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.CANCEL_LIMIT_ORDER_MODAL,
      params: { order },
    });
  }, [navigation, order]);

  return (
    <OpenLimitOrderDetailsModal
      sourceToken={sourceToken}
      destToken={destinationToken}
      // The sheet is opened from the open orders tab, where every order, being
      // executed or not, is still in progress.
      status={strings('bridge.limit.in_progress')}
      submittedAmount={strings('bridge.limit.quote_unit', {
        amount: formatLimitOrderAmount(
          order.src.amount,
          order.src.asset.decimals,
        ),
        symbol: sourceToken.symbol,
      })}
      triggerPrice={triggerPrice}
      triggerToken={triggerToken}
      expiry={formatLimitOrderDate(order.timingData.expiresAt)}
      onCancelOrder={
        order.isCancellable === false ? undefined : handleCancelOrder
      }
      goBack={navigation.goBack}
    />
  );
};
