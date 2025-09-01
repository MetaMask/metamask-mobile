import React, { useCallback } from 'react';
import { BridgeSourceNetworkSelector } from '../../../../../UI/Bridge/components/BridgeSourceNetworkSelector';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { setSelectedSourceChainIds } from '../../../../../../core/redux/slices/bridge';
import { Hex } from '@metamask/utils';

export function PayWithNetworkModal() {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const handleApply = useCallback(
    (selectedChainIds: Hex[]) => {
      dispatch(setSelectedSourceChainIds(selectedChainIds));
      navigation.goBack();
    },
    [dispatch, navigation],
  );

  return <BridgeSourceNetworkSelector onApply={handleApply} />;
}
