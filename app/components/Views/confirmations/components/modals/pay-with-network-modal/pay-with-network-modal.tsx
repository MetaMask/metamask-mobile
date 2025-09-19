import React, { useCallback, useMemo } from 'react';
import { BridgeSourceNetworkSelector } from '../../../../../UI/Bridge/components/BridgeSourceNetworkSelector';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { setSelectedSourceChainIds } from '../../../../../../core/redux/slices/bridge';
import { Hex } from '@metamask/utils';
import { useTransactionPayAvailableTokens } from '../../../hooks/pay/useTransactionPayAvailableTokens';
import { isSolanaChainId } from '@metamask/bridge-controller';

export function PayWithNetworkModal() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { availableChainIds } = useTransactionPayAvailableTokens();

  const chainIds = useMemo(
    () => availableChainIds.filter((chainId) => !isSolanaChainId(chainId)),
    [availableChainIds],
  );

  const handleApply = useCallback(
    (selectedChainIds: Hex[]) => {
      dispatch(setSelectedSourceChainIds(selectedChainIds));
      navigation.goBack();
    },
    [dispatch, navigation],
  );

  return (
    <BridgeSourceNetworkSelector chainIds={chainIds} onApply={handleApply} />
  );
}
