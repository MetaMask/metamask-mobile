import React, { useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectChainId,
  selectIsAllNetworks,
  selectAllPopularNetworkConfigurations,
} from '../../../../selectors/networkController';
import { selectTokenNetworkFilter } from '../../../../selectors/preferencesController';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import { useTheme } from '../../../../util/theme';
import createStyles from '../styles';
import Engine from '../../../../core/Engine';
import { View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import ListItemSelect from '../../../../component-library/components/List/ListItemSelect';
import { VerticalAlignment } from '../../../../component-library/components/List/ListItem';
import { strings } from '../../../../../locales/i18n';
import { enableAllNetworksFilter } from '../util/enableAllNetworksFilter';
import { WalletViewSelectorsIDs } from '../../../../../e2e/selectors/wallet/WalletView.selectors';
import NetworkImageComponent from '../../NetworkImages';
import {
  useNetworksByNamespace,
  NetworkType,
} from '../../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useNetworkSelection } from '../../../hooks/useNetworkSelection/useNetworkSelection';
import { isRemoveGlobalNetworkSelectorEnabled } from '../../../../util/networks';

enum FilterOption {
  AllNetworks,
  CurrentNetwork,
}

const TokenFilterBottomSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const allNetworks = useSelector(selectAllPopularNetworkConfigurations);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const chainId = useSelector(selectChainId);
  const tokenNetworkFilter = useSelector(selectTokenNetworkFilter);
  const isAllNetworks = useSelector(selectIsAllNetworks);
  const allNetworksEnabled = useMemo(
    () => enableAllNetworksFilter(allNetworks),
    [allNetworks],
  );
  const { networks } = useNetworksByNamespace({
    networkType: NetworkType.Popular,
  });
  const { selectNetwork } = useNetworkSelection({
    networks,
  });

  const onFilterControlsBottomSheetPress = (option: FilterOption) => {
    const { PreferencesController } = Engine.context;
    switch (option) {
      case FilterOption.AllNetworks:
        PreferencesController.setTokenNetworkFilter(allNetworksEnabled);
        sheetRef.current?.onCloseBottomSheet();
        break;
      case FilterOption.CurrentNetwork:
        PreferencesController.setTokenNetworkFilter({
          [chainId]: true,
        });
        sheetRef.current?.onCloseBottomSheet();
        break;
      default:
        break;
    }
    if (isRemoveGlobalNetworkSelectorEnabled()) {
      selectNetwork(chainId);
    }
  };

  const isCurrentNetwork = Boolean(
    tokenNetworkFilter[chainId] && Object.keys(tokenNetworkFilter).length === 1,
  );

  return (
    <BottomSheet shouldNavigateBack ref={sheetRef}>
      <View style={styles.bottomSheetWrapper}>
        <Text variant={TextVariant.HeadingMD} style={styles.bottomSheetTitle}>
          {strings('wallet.filter_by')}
        </Text>
        <ListItemSelect
          testID={WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER_ALL}
          onPress={() =>
            onFilterControlsBottomSheetPress(FilterOption.AllNetworks)
          }
          isSelected={isAllNetworks}
          gap={8}
          verticalAlignment={VerticalAlignment.Center}
        >
          <Text style={styles.bottomSheetText}>
            {strings('wallet.popular_networks')}
          </Text>
          <View style={styles.networkImageContainer}>
            <NetworkImageComponent
              isAllNetworksEnabled
              allNetworksEnabled={allNetworksEnabled}
              selectorButtonDisplayed={false}
            />
          </View>
        </ListItemSelect>
        <ListItemSelect
          testID={WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER_CURRENT}
          onPress={() =>
            onFilterControlsBottomSheetPress(FilterOption.CurrentNetwork)
          }
          isSelected={isCurrentNetwork}
          gap={8}
          verticalAlignment={VerticalAlignment.Center}
        >
          <Text style={styles.bottomSheetText}>
            {strings('wallet.current_network')}
          </Text>
          <View style={styles.networkImageContainer}>
            <NetworkImageComponent
              isAllNetworksEnabled={false}
              allNetworksEnabled={{ [chainId]: true }}
              selectorButtonDisplayed={false}
            />
          </View>
        </ListItemSelect>
      </View>
    </BottomSheet>
  );
};

export { TokenFilterBottomSheet };
