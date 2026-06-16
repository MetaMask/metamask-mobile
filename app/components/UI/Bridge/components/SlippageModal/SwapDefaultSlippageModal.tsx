import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Routes from '../../../../../constants/navigation/Routes';
import {
  selectSlippage,
  setSlippage,
} from '../../../../../core/redux/slices/bridge';
import { useParams } from '../../../../../util/navigation/navUtils';
import { DefaultSlippageModalContent } from './DefaultSlippageModal';
import { SwapSlippageModalParams } from './types';

export const SwapDefaultSlippageModal = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const slippage = useSelector(selectSlippage);
  const { sourceChainId, destChainId } = useParams<SwapSlippageModalParams>();

  const handleOpenCustomSlippage = useCallback(() => {
    navigation.goBack();
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SWAP_CUSTOM_SLIPPAGE_MODAL,
      params: { sourceChainId, destChainId },
    });
  }, [navigation, sourceChainId, destChainId]);

  const handleSubmitSlippage = useCallback(
    (nextSlippage: string | undefined) => {
      dispatch(setSlippage(nextSlippage));
    },
    [dispatch],
  );

  return (
    <DefaultSlippageModalContent
      initialSlippage={slippage}
      sourceChainId={sourceChainId}
      destChainId={destChainId}
      onSubmitSlippage={handleSubmitSlippage}
      onOpenCustomSlippage={handleOpenCustomSlippage}
    />
  );
};
