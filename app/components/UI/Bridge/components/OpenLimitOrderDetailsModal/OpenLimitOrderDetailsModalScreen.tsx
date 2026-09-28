import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { useParams } from '../../../../../util/navigation/navUtils';
import { useFiatToUsdRate } from '../../hooks/useFiatToUsdRate';
import { formatLimitOrderAmount } from '../../utils/limitOrders/formatLimitOrderAmount';
import { formatLimitOrderDate } from '../../utils/limitOrders/formatLimitOrderDate';
import { getLimitOrderTokens } from '../../utils/limitOrders/getLimitOrderTokens';
import { OpenLimitOrderDetailsModal } from './OpenLimitOrderDetailsModal';
import type { OpenLimitOrderDetailsModalParams } from './types';
import { getTriggerPrice } from './utils';

export const OpenLimitOrderDetailsModalScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { order } = useParams<OpenLimitOrderDetailsModalParams>();
  const currentCurrency = useSelector(selectCurrentCurrency);
  const { sourceToken, destinationToken } = getLimitOrderTokens(order);
  const fiatToUsdRate = useFiatToUsdRate(sourceToken.chainId);
  const { triggerPrice, triggerToken, usdTriggerPrice } = getTriggerPrice(
    order,
    sourceToken,
    destinationToken,
    currentCurrency,
    fiatToUsdRate,
  );

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
      triggerPrice={triggerPrice}
      triggerToken={triggerToken}
      usdTriggerPrice={usdTriggerPrice}
      expiry={formatLimitOrderDate(order.timingData.expiresAt)}
      onCancelOrder={handleCancelOrder}
      goBack={navigation.goBack}
    />
  );
};
