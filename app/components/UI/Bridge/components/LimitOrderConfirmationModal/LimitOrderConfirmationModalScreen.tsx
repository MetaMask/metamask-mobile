import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { useParams } from '../../../../../util/navigation/navUtils';
import { selectSlippage } from '../../../../../core/redux/slices/bridge';
import { LIMIT_ORDER_DEFAULT_SLIPPAGE } from '../../constants/limitOrders';
import {LimitOrderConfirmationModal} from './LimitOrderConfirmationModal';
import type { LimitOrderConfirmationModalParams } from './types';

export const LimitOrderConfirmationModalScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const params = useParams<LimitOrderConfirmationModalParams>();
  const { sourceToken, destToken } = params;
  const slippage = useSelector(selectSlippage);

  const handleEditSlippagePress = useCallback(() => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SWAP_DEFAULT_SLIPPAGE_MODAL,
      params: {
        sourceChainId: sourceToken?.chainId,
        destChainId: destToken?.chainId,
      },
    });
  }, [destToken?.chainId, navigation, sourceToken?.chainId]);

  const handleConfirm = useCallback(() => {
    // STUB FOR LIMIT ORDER CREATION
    console.warn('Confirm limit order');
  }, []);

  return (
    <LimitOrderConfirmationModal
      {...params}
      slippage={`${slippage ?? LIMIT_ORDER_DEFAULT_SLIPPAGE}%`}
      goBack={navigation.goBack}
      onConfirm={handleConfirm}
      onEditSlippagePress={handleEditSlippagePress}
    />
  );
};
