import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Routes from '../../../../../constants/navigation/Routes';
import {
  selectBatchSellSlippages,
  setBatchSellTokenSlippage,
} from '../../../../../core/redux/slices/bridge';
import { useParams } from '../../../../../util/navigation/navUtils';
import { DefaultSlippageModalContent } from './DefaultSlippageModal';
import { BatchSellSlippageModalParams } from './types';
import { getBatchSellInitialSlippage } from './utils';

export const BatchSellDefaultSlippageModal = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const batchSellSlippages = useSelector(selectBatchSellSlippages);
  const { sourceChainId, destChainId, batchSellAssetId } =
    useParams<BatchSellSlippageModalParams>();
  const initialSlippage = getBatchSellInitialSlippage(
    batchSellSlippages,
    batchSellAssetId,
  );

  const handleOpenCustomSlippage = useCallback(() => {
    navigation.goBack();
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.BATCH_SELL_CUSTOM_SLIPPAGE_MODAL,
      params: { sourceChainId, destChainId, batchSellAssetId },
    });
  }, [navigation, sourceChainId, destChainId, batchSellAssetId]);

  const handleSubmitSlippage = useCallback(
    (nextSlippage: string | undefined) => {
      dispatch(
        setBatchSellTokenSlippage({
          assetId: batchSellAssetId,
          slippage: nextSlippage,
        }),
      );
    },
    [batchSellAssetId, dispatch],
  );

  return (
    <DefaultSlippageModalContent
      initialSlippage={initialSlippage}
      sourceChainId={sourceChainId}
      destChainId={destChainId}
      onSubmitSlippage={handleSubmitSlippage}
      onOpenCustomSlippage={handleOpenCustomSlippage}
    />
  );
};
