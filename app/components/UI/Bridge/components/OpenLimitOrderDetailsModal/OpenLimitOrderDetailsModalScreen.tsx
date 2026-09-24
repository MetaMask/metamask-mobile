import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useParams } from '../../../../../util/navigation/navUtils';
import { formatLimitOrderAmount } from '../../utils/limitOrders/formatLimitOrderAmount';
import { formatLimitOrderDate } from '../../utils/limitOrders/formatLimitOrderDate';
import { formatLimitOrderQuickPrice } from '../../utils/limitOrders/formatLimitOrderQuickPrice';
import { getLimitOrderTokens } from '../../utils/limitOrders/getLimitOrderTokens';
import { OpenLimitOrderDetailsModal } from './OpenLimitOrderDetailsModal';
import type { OpenLimitOrderDetailsModalParams } from './types';

export const OpenLimitOrderDetailsModalScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { order } = useParams<OpenLimitOrderDetailsModalParams>();
  const { sourceToken, destinationToken } = getLimitOrderTokens(order);

  // STUB FOR LIMIT ORDER CANCELLATION: the order still needs to be cancelled
  // through the limit orders service.
  const handleCancelConfirmed = useCallback(() => {
    console.warn('cancel');
  }, []);

  const handleCancelOrder = useCallback(() => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.CANCEL_LIMIT_ORDER_MODAL,
      params: { onConfirm: handleCancelConfirmed },
    });
  }, [handleCancelConfirmed, navigation]);

  return (
    <OpenLimitOrderDetailsModal
      sourceToken={sourceToken}
      destToken={destinationToken}
      // Only an open order can be cancelled, which is the sole action this
      // sheet offers, so it is the only status the tab row opens it for.
      status={strings('bridge.limit.in_progress')}
      submittedAmount={strings('bridge.limit.quote_unit', {
        amount: formatLimitOrderAmount(
          order.src.amount,
          order.src.asset.decimals,
        ),
        symbol: sourceToken.symbol,
      })}
      // `limitPrice` is quoted as destination token per unit of source token,
      // so it reads as an amount of the destination token.
      triggerPrice={strings('bridge.limit.quote_unit', {
        amount:
          formatLimitOrderQuickPrice(order.limitPrice) ?? order.limitPrice,
        symbol: destinationToken.symbol,
      })}
      triggerToken={destinationToken}
      // `triggerComparison` is left unset on purpose: the order carries neither
      // a market price nor the side its trigger was quoted on, so the
      // "% from market" line stays hidden until the response can support it.
      expiry={formatLimitOrderDate(order.expiresAt)}
      onCancelOrder={handleCancelOrder}
      goBack={navigation.goBack}
    />
  );
};
