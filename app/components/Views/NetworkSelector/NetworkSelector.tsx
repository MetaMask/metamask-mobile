// Third party dependencies.
import React, { useRef } from 'react';
import { Platform, Switch, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import images from 'images/image-icons';
import urlParse from 'url-parse';
import { useNavigation } from '@react-navigation/native';
import { FrequentRpc } from '@metamask/preferences-controller';
import { ProviderConfig } from '@metamask/network-controller';

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
import { useDispatch, useSelector } from 'react-redux';
import { selectProviderConfig } from '../../../selectors/networkController';
import Networks, {
  compareRpcUrls,
  getAllNetworks,
  getDecimalChainId,
  getNetworkImageSource,
} from '../../../util/networks';
import { EngineState } from 'app/selectors/types';
import {
  LINEA_TESTNET_NICKNAME,
  LINEA_TESTNET_TICKER,
  MAINNET,
  NETWORKS_CHAIN_ID,
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
import Routes from '../../../constants/navigation/Routes';
import generateTestId from '../../../../wdio/utils/generateTestId';
import { ADD_NETWORK_BUTTON } from '../../../../wdio/screen-objects/testIDs/Screens/NetworksScreen.testids';
import { NETWORK_SCROLL_ID } from '../../../../wdio/screen-objects/testIDs/Components/NetworkListModal.TestIds';
import { colors as importedColors } from '../../../styles/common';
import { useAppTheme } from '../../../util/theme';
import Text from '../../../component-library/components/Texts/Text/Text';
import {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { showTestNetworksAction } from '../../../actions/onboardNetwork';

// Internal dependencies
import styles from './NetworkSelector.styles';

const NetworkSelector = () => {
  const { navigate } = useNavigation();
  const { colors } = useAppTheme();
  const sheetRef = useRef<SheetBottomRef>(null);
  const dispatch = useDispatch();
  const showTestNetworks = useSelector(
    (state: any) => state.networkOnboarded.showTestNetworks,
  );
  const thirdPartyApiMode = useSelector(
    (state: any) => state.privacy.thirdPartyApiMode,
  );

  const providerConfig: ProviderConfig = useSelector(selectProviderConfig);
  const frequentRpcList: FrequentRpc[] = useSelector(
    (state: EngineState) =>
      state.engine.backgroundState.PreferencesController.frequentRpcList,
  );

  const onNetworkChange = (type: string) => {
    const { NetworkController, CurrencyRateController } = Engine.context;
    CurrencyRateController.setNativeCurrency('ETH');
    NetworkController.setProviderType(type);
    thirdPartyApiMode &&
      setTimeout(() => {
        Engine.refreshTransactionHistory();
      }, 1000);

    sheetRef.current?.hide();

    analyticsV2.trackEvent(MetaMetricsEvents.NETWORK_SWITCHED, {
      chain_id: providerConfig.chainId,
      from_network:
        providerConfig.type === 'rpc'
          ? providerConfig.nickname
          : providerConfig.type,
      to_network: type,
    });
  };

  const onSetRpcTarget = async (rpcTarget: string) => {
    const { PreferencesController, CurrencyRateController, NetworkController } =
      Engine.context;

    const isLineaTestnetInFrequentRpcList =
      frequentRpcList.findIndex(
        (frequentRpc: FrequentRpc) =>
          frequentRpc.chainId?.toString() === NETWORKS_CHAIN_ID.LINEA_TESTNET,
      ) !== -1;

    let rpc = frequentRpcList.find(({ rpcUrl }: { rpcUrl: string }) =>
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

    CurrencyRateController.setNativeCurrency(ticker);

    NetworkController.setRpcTarget(rpcUrl, chainId, ticker, nickname);

    sheetRef.current?.hide();
    analyticsV2.trackEvent(MetaMetricsEvents.NETWORK_SWITCHED, {
      chain_id: providerConfig.chainId,
      from_network: providerConfig.type,
      to_network: nickname,
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
        isSelected={
          chainId.toString() === providerConfig.chainId &&
          !providerConfig.rpcTarget
        }
        onPress={() => onNetworkChange(MAINNET)}
      />
    );
  };

  const renderRpcNetworks = () => {
    const rpcList = frequentRpcList.filter(
      ({ chainId }: { chainId: string }) =>
        chainId !== NETWORKS_CHAIN_ID.LINEA_TESTNET,
    );

    return rpcList.map(
      ({
        nickname,
        rpcUrl,
        chainId,
      }: {
        nickname: string;
        rpcUrl: string;
        chainId: string;
      }) => {
        if (!chainId) return null;
        const { name } = { name: nickname || rpcUrl };
        //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
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
            isSelected={
              chainId.toString() === providerConfig.chainId &&
              providerConfig.rpcTarget
            }
            onPress={() => onSetRpcTarget(rpcUrl)}
          />
        );
      },
    );
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
          isSelected={chainId.toString() === providerConfig.chainId}
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
    //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
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
    sheetRef.current?.hide(() => {
      navigate(Routes.ADD_NETWORK, {
        shouldNetworkSwitchPopToWallet: false,
      });
    });
  };

  const renderTestNetworksSwitch = () => (
    <View style={styles.switchContainer}>
      <Text variant={TextVariant.BodyLGMedium} color={TextColor.Alternative}>
        {strings('networks.show_test_networks')}
      </Text>
      <Switch
        onValueChange={(value: boolean) => {
          dispatch(showTestNetworksAction(value));
        }}
        value={showTestNetworks}
        trackColor={{
          true: colors.primary.default,
          false: colors.border.muted,
        }}
        thumbColor={importedColors.white}
        ios_backgroundColor={colors.border.muted}
        testID="test-network-switch-id"
      />
    </View>
  );

  return (
    <SheetBottom ref={sheetRef}>
      <SheetHeader title={strings('networks.select_network')} />
      <ScrollView {...generateTestId(Platform, NETWORK_SCROLL_ID)}>
        {renderMainnet()}
        {renderRpcNetworks()}
        {renderTestNetworksSwitch()}
        {showTestNetworks && renderOtherNetworks()}
        {showTestNetworks &&
          renderNonInfuraNetwork(
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
        style={styles.addNetworkButton}
        {...generateTestId(Platform, ADD_NETWORK_BUTTON)}
      />
    </SheetBottom>
  );
};

export default NetworkSelector;
