// Third party dependencies.
import React, { useCallback, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import images from 'images/image-icons';
import urlParse from 'url-parse';

// External dependencies.
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import Cell, {
  CellVariants,
} from '../../../component-library/components/Cells/Cell';
import { AvatarVariants } from '../../../component-library/components/Avatars/Avatar';
import { strings } from '../../../../locales/i18n';
import SheetBottom, {
  SheetBottomRef,
} from '../../../component-library/components/Sheet/SheetBottom';
import { useSelector } from 'react-redux';
import { selectProviderConfig } from '../../../selectors/networkController';
import Networks, {
  compareRpcUrls,
  getAllNetworks,
  getDecimalChainId,
  getNetworkImageSource,
  isSafeChainId,
} from '../../../util/networks';
import { EngineState } from 'app/selectors/types';
import {
  LINEA_TESTNET_NICKNAME,
  LINEA_TESTNET_TICKER,
  MAINNET,
  NETWORKS_CHAIN_ID,
  PRIVATENETWORK,
} from '../../../constants/network';
import {
  LINEA_TESTNET_BLOCK_EXPLORER,
  LINEA_TESTNET_RPC_URL,
} from '../../../constants/urls';
import Button from '../../../component-library/components/Buttons/Button/Button';
import {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import Engine from '../../../core/Engine';
import analyticsV2 from '../../../util/analyticsV2';
import { MetaMetricsEvents } from '../../../core/Analytics';
import sanitizeUrl from '../../../util/sanitizeUrl';
import { useNavigation } from '@react-navigation/native';

const NetworkSelector = () => {
  const { navigate, goBack } = useNavigation();
  const sheetRef = useRef<SheetBottomRef>(null);

  const currentBottomNavRoute = useSelector(
    (state: any) => state.navigation.currentBottomNavRoute,
  );

  const thirdPartyApiMode = useSelector(
    (state: any) => state.privacy.thirdPartyApiMode,
  );
  const providerConfig = useSelector(selectProviderConfig);
  const frequentRpcList = useSelector(
    (state: EngineState) =>
      state.engine.backgroundState.PreferencesController.frequentRpcList,
  );

  const onNetworkChange = (type: string) => {
    //handleNetworkSelected(type, ETH, type);
    const { NetworkController, CurrencyRateController } = Engine.context;
    CurrencyRateController.setNativeCurrency('ETH');
    NetworkController.setProviderType(type);
    thirdPartyApiMode &&
      setTimeout(() => {
        Engine.refreshTransactionHistory();
      }, 1000);
    goBack();
  };

  const onSetRpcTarget = async (rpcTarget: string) => {
    const { PreferencesController, CurrencyRateController, NetworkController } =
      Engine.context;

    const isLineaTestnetInFrequentRpcList =
      frequentRpcList.findIndex(
        (frequentRpc) =>
          frequentRpc.chainId?.toString() === NETWORKS_CHAIN_ID.LINEA_TESTNET,
      ) !== -1;

    let rpc = frequentRpcList.find(({ rpcUrl }) =>
      compareRpcUrls(rpcUrl, rpcTarget),
    );

    if (
      !isLineaTestnetInFrequentRpcList &&
      compareRpcUrls(rpcTarget, LINEA_TESTNET_RPC_URL)
    ) {
      const url = new urlParse(LINEA_TESTNET_RPC_URL);
      const decimalChainId = getDecimalChainId(NETWORKS_CHAIN_ID.LINEA_TESTNET);

      PreferencesController.addToFrequentRpcList(
        url.href,
        decimalChainId,
        LINEA_TESTNET_TICKER,
        LINEA_TESTNET_NICKNAME,
        {
          blockExplorerUrl: LINEA_TESTNET_BLOCK_EXPLORER,
        },
      );

      const analyticsParamsAdd = {
        chain_id: decimalChainId,
        source: 'Popular network list',
        symbol: LINEA_TESTNET_TICKER,
      };

      analyticsV2.trackEvent(
        MetaMetricsEvents.NETWORK_ADDED,
        analyticsParamsAdd,
      );

      rpc = {
        rpcUrl: url.href,
        chainId: decimalChainId,
        ticker: LINEA_TESTNET_TICKER,
        nickname: LINEA_TESTNET_NICKNAME,
      };
    }

    const { rpcUrl, chainId, ticker, nickname } = rpc;

    const useRpcName = nickname || sanitizeUrl(rpcUrl);
    const useTicker = ticker || PRIVATENETWORK;
    // handleNetworkSelected(useRpcName, useTicker, sanitizeUrl(rpcUrl));

    // If the network does not have chainId then show invalid custom network alert
    const chainIdNumber = parseInt(chainId, 10);
    if (!isSafeChainId(chainIdNumber)) {
      //See where those are coming from
      // this.props.onClose(false);
      // this.props.showInvalidCustomNetworkAlert(rpcTarget);
      return;
    }

    CurrencyRateController.setNativeCurrency(ticker);
    NetworkController.setRpcTarget(rpcUrl, chainId, ticker, nickname);
    goBack();

    analyticsV2.trackEvent(MetaMetricsEvents.NETWORK_SWITCHED, {
      chain_id: chainId,
      source: currentBottomNavRoute,
      symbol: ticker,
    });
  };

  const renderMainnet = () => {
    const { name: mainnetName, chainId } = Networks.mainnet;
    return (
      <Cell
        variant={CellVariants.Select}
        title={mainnetName}
        avatarProps={{
          variant: AvatarVariants.Network,
          name: mainnetName,
          imageSource: images.ETHEREUM,
        }}
        isSelected={chainId.toString() === providerConfig.chainId}
        onPress={() => onNetworkChange(MAINNET)}
      />
    );
  };

  const renderRpcNetworks = () => {
    const rpcList = frequentRpcList.filter(
      ({ chainId }) => chainId?.toString() !== NETWORKS_CHAIN_ID.LINEA_TESTNET,
    );

    return rpcList.map(({ nickname, rpcUrl, chainId }) => {
      if (!chainId) return null;
      const { name } = { name: nickname || rpcUrl };
      const image = getNetworkImageSource({ chainId: chainId?.toString() });

      return (
        <Cell
          key={chainId}
          variant={CellVariants.Select}
          title={name}
          avatarProps={{
            variant: AvatarVariants.Network,
            name,
            imageSource: image,
          }}
          isSelected={chainId.toString() === providerConfig.chainId}
          onPress={() => onSetRpcTarget(rpcUrl)}
        />
      );
    });
  };

  const renderOtherNetworks = () => {
    const getOtherNetworks = () => getAllNetworks().slice(1);
    return getOtherNetworks().map((network) => {
      const { name, imageSource, chainId, networkType } = Networks[network];

      return (
        <Cell
          key={chainId}
          variant={CellVariants.Select}
          title={name}
          avatarProps={{
            variant: AvatarVariants.Network,
            name,
            imageSource,
          }}
          isSelected={chainId === providerConfig.chainId}
          onPress={() => onNetworkChange(networkType)}
        />
      );
    });
  };

  const renderNonInfuraNetwork = (
    chainId: string,
    rpcUrl: string,
    nickname: string,
  ) => {
    const image = getNetworkImageSource({ chainId: chainId.toString() });

    return (
      <Cell
        key={chainId}
        variant={CellVariants.Select}
        title={nickname || rpcUrl}
        avatarProps={{
          variant: AvatarVariants.Network,
          name: nickname,
          imageSource: image,
        }}
        isSelected={chainId === providerConfig.chainId}
        onPress={() => onSetRpcTarget(rpcUrl)}
      />
    );
  };

  const goToNetworkSettings = () => {
    navigate('SettingsView', {
      screen: 'SettingsFlow',
      params: {
        screen: 'NetworkSettings',
        params: {
          isFullScreenModal: true,
        },
      },
    });
  };

  return (
    <SheetBottom ref={sheetRef}>
      <SheetHeader title={strings('networks.select_network')} />
      <ScrollView /* testID={NETWORK_SCROLL_ID} */
      /* style={styles.networksWrapper} */
      >
        {renderMainnet()}
        {renderRpcNetworks()}
        {renderOtherNetworks()}
        {renderNonInfuraNetwork(
          NETWORKS_CHAIN_ID.LINEA_TESTNET,
          LINEA_TESTNET_RPC_URL,
          LINEA_TESTNET_NICKNAME,
        )}
      </ScrollView>

      <Button
        variant={ButtonVariants.Secondary}
        label={strings('app_settings.network_add_network')}
        onPress={goToNetworkSettings}
        width={ButtonWidthTypes.Full}
        size={ButtonSize.Lg}
        style={{ marginHorizontal: 16 }}
      />
    </SheetBottom>
  );
};

export default NetworkSelector;
