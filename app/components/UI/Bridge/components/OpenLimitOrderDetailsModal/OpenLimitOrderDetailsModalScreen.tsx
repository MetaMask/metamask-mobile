import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { Hex } from '@metamask/utils';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { LimitOrderExecutionType } from '../../constants/limitOrders';
import type { BridgeToken } from '../../types';
import { getSwapsLimitOrderPriceMarketComparison } from '../../utils/limitOrders/getSwapsLimitOrderPriceMarketComparison';
import { OpenLimitOrderDetailsModal } from './OpenLimitOrderDetailsModal';

// MOCK DATA: the open orders list does not carry order details yet, so the
// sheet is fed a fixed order until it is wired to a real limit order.
const MOCK_SOURCE_TOKEN: BridgeToken = {
  address: '0x0000000000000000000000000000000000000000',
  chainId: '0x1' as Hex,
  decimals: 18,
  image: '',
  name: 'Ethereum',
  symbol: 'ETH',
};

const MOCK_DEST_TOKEN: BridgeToken = {
  address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
  chainId: '0x1' as Hex,
  decimals: 8,
  image: '',
  name: 'Wrapped Bitcoin',
  symbol: 'WBTC',
};

const MOCK_SUBMITTED_AMOUNT = '0.1 ETH';
const MOCK_TRIGGER_LIMIT_FIAT = '3412.20';
const MOCK_TRIGGER_MARKET_FIAT = 3590;
const MOCK_TRIGGER_PRICE = '@ $3,412.20';
const MOCK_EXPIRY = '7 days';

export const OpenLimitOrderDetailsModalScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();

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

  const triggerComparison = getSwapsLimitOrderPriceMarketComparison({
    limitFiat: MOCK_TRIGGER_LIMIT_FIAT,
    marketFiat: MOCK_TRIGGER_MARKET_FIAT,
    executionType: LimitOrderExecutionType.BUY,
    threshold: 0,
  });

  return (
    <OpenLimitOrderDetailsModal
      sourceToken={MOCK_SOURCE_TOKEN}
      destToken={MOCK_DEST_TOKEN}
      status={strings('bridge.limit.in_progress')}
      submittedAmount={MOCK_SUBMITTED_AMOUNT}
      triggerPrice={MOCK_TRIGGER_PRICE}
      triggerToken={MOCK_DEST_TOKEN}
      triggerComparison={triggerComparison}
      expiry={MOCK_EXPIRY}
      onCancelOrder={handleCancelOrder}
      goBack={navigation.goBack}
    />
  );
};
