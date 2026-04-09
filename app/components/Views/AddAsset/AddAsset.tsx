import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import { selectNetworkConfigurations } from '../../../selectors/networkController';
import { useNavigation } from '@react-navigation/native';
import { useParams } from '../../../util/navigation/navUtils';
import { BottomSheetRef } from '../../../component-library/components/BottomSheets/BottomSheet';
import { Hex } from '@metamask/utils';
import Engine from '../../../core/Engine';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { isNonEvmChainId } from '../../../core/Multichain/utils';
import { useNetworkEnablement } from '../../hooks/useNetworkEnablement/useNetworkEnablement';
import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard';
import NetworkListBottomSheet from './components/NetworkListBottomSheet/NetworkListBottomSheet';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import TokenView from './Views/TokenView/TokenView';
import NFTView from './Views/NFTView/NFTView';

export interface AddAssetParams {
  assetType: 'token' | 'collectible';
  collectibleContract?: {
    address: string;
  };
}

const AddAsset = () => {
  const navigation = useNavigation();
  const { assetType, collectibleContract } = useParams<AddAssetParams>();

  const tw = useTailwind();
  const insets = useSafeAreaInsets();

  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const [openNetworkSelector, setOpenNetworkSelector] = useState(false);
  const { enabledNetworksForAllNamespaces } = useNetworkEnablement();
  const enabledChainId = useMemo(
    () =>
      Object.keys(enabledNetworksForAllNamespaces).find(
        (chainId) => enabledNetworksForAllNamespaces[chainId as Hex] === true,
      ) ?? '0x1', // Fallback to Ethereum Mainnet if no networks are enabled
    [enabledNetworksForAllNamespaces],
  );
  const [selectedNetwork, setSelectedNetwork] = useState<
    SupportedCaipChainId | Hex | null
  >(enabledChainId as Hex);

  const sheetRef = useRef<BottomSheetRef>(null);

  const renderNetworkSelector = useCallback(
    () => (
      <NetworkListBottomSheet
        selectedNetwork={selectedNetwork}
        setSelectedNetwork={async (network) => {
          setSelectedNetwork(network);
          if (!isNonEvmChainId(network)) {
            Engine.context.TokenListController.fetchTokenList(network as Hex);
          }
        }}
        setOpenNetworkSelector={setOpenNetworkSelector}
        sheetRef={sheetRef}
        displayEvmNetworksOnly={assetType === 'collectible'}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [openNetworkSelector, networkConfigurations, selectedNetwork, assetType],
  );

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={tw.style('flex-1 bg-default', { paddingTop: insets.top })}
      testID={`add-${assetType}-screen`}
    >
      {/* Header */}
      <HeaderCompactStandard
        title={strings(
          `add_asset.${assetType === 'token' ? 'title' : 'title_nft'}`,
        )}
        onBack={() => navigation.goBack()}
      />

      {assetType === 'token' && (
        <TokenView
          openNetworkSelector={() => setOpenNetworkSelector(true)}
          selectedNetwork={selectedNetwork}
          networkConfigurations={networkConfigurations}
        />
      )}

      {assetType === 'collectible' && (
        <NFTView
          collectibleContract={collectibleContract}
          selectedNetwork={selectedNetwork}
          openNetworkSelector={() => setOpenNetworkSelector(true)}
          networkConfigurations={networkConfigurations}
        />
      )}

      {openNetworkSelector ? renderNetworkSelector() : null}
    </SafeAreaView>
  );
};

export default AddAsset;
