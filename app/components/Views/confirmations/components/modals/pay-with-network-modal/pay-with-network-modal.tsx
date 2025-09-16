import React, { useCallback } from 'react';
import { BridgeSourceNetworkSelector } from '../../../../../UI/Bridge/components/BridgeSourceNetworkSelector';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { setSelectedSourceChainIds } from '../../../../../../core/redux/slices/bridge';
import { Hex } from '@metamask/utils';
import { useTransactionPayAvailableTokens } from '../../../hooks/pay/useTransactionPayAvailableTokens';

export function PayWithNetworkModal() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { availableChainIds } = useTransactionPayAvailableTokens();

  const handleApply = useCallback(
    (selectedChainIds: Hex[]) => {
      dispatch(setSelectedSourceChainIds(selectedChainIds));
      navigation.goBack();
    },
    [dispatch, navigation],
  );

  return (
    <BridgeSourceNetworkSelector
      chainIds={availableChainIds}
      onApply={handleApply}
    />
  );
}
