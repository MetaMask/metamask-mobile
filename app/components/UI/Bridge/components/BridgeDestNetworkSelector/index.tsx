import React, { useCallback } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Box } from '../../../Box/Box';
import { useStyles } from '../../../../../component-library/hooks';
import {
  selectBridgeViewMode,
  selectEnabledDestChains,
  setSelectedDestChainId,
} from '../../../../../core/redux/slices/bridge';
import ListItem from '../../../../../component-library/components/List/ListItem/ListItem';
import { VerticalAlignment } from '../../../../../component-library/components/List/ListItem/ListItem.types';
import { Hex, CaipChainId } from '@metamask/utils';
import { BridgeNetworkSelectorBase } from '../BridgeNetworkSelectorBase';
import { NetworkRow } from '../NetworkRow';
import Routes from '../../../../../constants/navigation/Routes';
import { selectChainId } from '../../../../../selectors/networkController';
import { BridgeViewMode } from '../../types';
import { useSwitchNetworks } from '../../../../Views/NetworkSelector/useSwitchNetworks';
import { useNetworkInfo } from '../../../../../selectors/selectedNetworkController';

export interface BridgeDestNetworkSelectorRouteParams {
  shouldGoToTokens?: boolean;
}

const createStyles = () =>
  StyleSheet.create({
    listContent: {
      padding: 8,
    },
  });

export const BridgeDestNetworkSelector: React.FC = () => {
  const { styles } = useStyles(createStyles, {});
  const navigation = useNavigation();
  const route =
    useRoute<
      RouteProp<{ params: BridgeDestNetworkSelectorRouteParams }, 'params'>
    >();
  const dispatch = useDispatch();
  const enabledDestChains = useSelector(selectEnabledDestChains);
  const currentChainId = useSelector(selectChainId);
  const bridgeViewMode = useSelector(selectBridgeViewMode);
  const {
    chainId: selectedEvmChainId,
    domainIsConnectedDapp,
    networkName: selectedNetworkName,
  } = useNetworkInfo();
  const { onEnableNetwork } = useSwitchNetworks({
    domainIsConnectedDapp,
    selectedChainId: selectedEvmChainId,
    selectedNetworkName,
  });

  const handleChainSelect = useCallback(
    (chainId: Hex | CaipChainId) => {
      dispatch(setSelectedDestChainId(chainId));
      onEnableNetwork(chainId);

      navigation.goBack();

      if (route?.params?.shouldGoToTokens) {
        navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
          screen: Routes.BRIDGE.MODALS.DEST_TOKEN_SELECTOR,
        });
      }
    },
    [dispatch, navigation, route?.params?.shouldGoToTokens, onEnableNetwork],
  );

  const renderDestChains = useCallback(
    () =>
      enabledDestChains
        .filter((chain) => {
          if (bridgeViewMode === BridgeViewMode.Unified) {
            return true;
          }
          return chain.chainId !== currentChainId;
        })
        .map((chain) => (
          <TouchableOpacity
            key={chain.chainId}
            onPress={() => handleChainSelect(chain.chainId)}
          >
            <ListItem verticalAlignment={VerticalAlignment.Center}>
              <NetworkRow chainId={chain.chainId} chainName={chain.name} />
            </ListItem>
          </TouchableOpacity>
        )),
    [enabledDestChains, handleChainSelect, currentChainId, bridgeViewMode],
  );

  return (
    <BridgeNetworkSelectorBase>
      <Box style={styles.listContent}>{renderDestChains()}</Box>
    </BridgeNetworkSelectorBase>
  );
};
