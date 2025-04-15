import React, { useCallback } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Box } from '../../../Box/Box';
import { useStyles } from '../../../../../component-library/hooks';
import {
  selectEnabledDestChains,
  setSelectedDestChainId,
} from '../../../../../core/redux/slices/bridge';
import ListItem from '../../../../../component-library/components/List/ListItem/ListItem';
import { VerticalAlignment } from '../../../../../component-library/components/List/ListItem/ListItem.types';
import { Hex, CaipChainId } from '@metamask/utils';
import { BridgeNetworkSelectorBase } from '../BridgeNetworkSelectorBase';
import { NetworkRow } from '../NetworkRow';

const createStyles = () => StyleSheet.create({
    listContent: {
      padding: 8,
    },
  });

export const BridgeDestNetworkSelector: React.FC = () => {
  const { styles } = useStyles(createStyles, {});
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const enabledDestChains = useSelector(selectEnabledDestChains);

  const handleChainSelect = useCallback((chainId: Hex | CaipChainId) => {
    dispatch(setSelectedDestChainId(chainId));
    navigation.goBack();
  }, [dispatch, navigation]);

  const renderDestChains = useCallback(() => (
    enabledDestChains.map((chain) => (
      <TouchableOpacity
        key={chain.chainId}
        onPress={() => handleChainSelect(chain.chainId)}
      >
        <ListItem
          verticalAlignment={VerticalAlignment.Center}
        >
          <NetworkRow
            chainId={chain.chainId}
            chainName={chain.name}
          />
        </ListItem>
      </TouchableOpacity>
    ))
  ), [enabledDestChains, handleChainSelect]);

  return (
    <BridgeNetworkSelectorBase>
      <Box style={styles.listContent}>
        {renderDestChains()}
      </Box>
    </BridgeNetworkSelectorBase>
  );
};
