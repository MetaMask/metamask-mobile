import React, { useCallback } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
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
import { StackScreenProps } from '@react-navigation/stack';
import { RootParamList } from '../../../../../util/navigation/types';

type BridgeDestNetworkSelectorProps = StackScreenProps<
  RootParamList,
  'BridgeDestNetworkSelector'
>;

const createStyles = () =>
  StyleSheet.create({
    listContent: {
      padding: 8,
    },
  });

export const BridgeDestNetworkSelector: React.FC<
  BridgeDestNetworkSelectorProps
> = ({ route }) => {
  const { styles } = useStyles(createStyles, {});
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const enabledDestChains = useSelector(selectEnabledDestChains);
  const currentChainId = useSelector(selectChainId);
  const bridgeViewMode = useSelector(selectBridgeViewMode);

  const handleChainSelect = useCallback(
    (chainId: Hex | CaipChainId) => {
      dispatch(setSelectedDestChainId(chainId));

      navigation.goBack();

      if (route?.params?.shouldGoToTokens) {
        navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
          screen: Routes.BRIDGE.MODALS.DEST_TOKEN_SELECTOR,
        });
      }
    },
    [dispatch, navigation, route?.params?.shouldGoToTokens],
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
