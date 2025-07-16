import { useDispatch, useSelector } from 'react-redux';
import {
  PayAsset,
  selectPayAsset,
  setPayAsset as setPayAssetAction,
} from '../../../../../core/redux/slices/confirmationMetrics';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import { EMPTY_ADDRESS } from '../../../../../constants/transaction';
import { ChainId } from '@metamask/controller-utils';
import { useCallback } from 'react';
import { RootState } from '../../../../../reducers';

export function usePayAsset() {
  const dispatch = useDispatch();

  const { chainId: transactionChainId, id: transactionId } =
    useTransactionMetadataRequest() || {};

  const selectedPayAsset = useSelector((state: RootState) =>
    selectPayAsset(state, transactionId as string),
  );

  const defaultPayAsset: PayAsset = {
    address: EMPTY_ADDRESS,
    chainId: transactionChainId ?? ChainId.mainnet,
  };

  const setPayAsset = useCallback(
    (asset: PayAsset) => {
      dispatch(
        setPayAssetAction({ id: transactionId as string, payAsset: asset }),
      );
    },
    [dispatch, transactionId],
  );

  const payAsset = selectedPayAsset ?? defaultPayAsset;

  return {
    payAsset,
    setPayAsset,
  };
}
