// Third party dependencies.
import React, { useRef } from 'react';
import { Switch, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import images from 'images/image-icons';
import { useNavigation } from '@react-navigation/native';
import { ProviderConfig } from '@metamask/network-controller';

// External dependencies.
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import Cell, {
  CellVariant,
} from '../../../component-library/components/Cells/Cell';
import { AvatarVariant } from '../../../component-library/components/Avatars/Avatar';
import { strings } from '../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import { useSelector } from 'react-redux';
import {
  selectNetworkConfigurations,
  selectProviderConfig,
} from '../../../selectors/networkController';
import { selectShowTestNetworks } from '../../../selectors/preferencesController';
import Networks, {
  compareRpcUrls,
  getAllNetworks,
  getDecimalChainId,
  isTestNet,
  getNetworkImageSource,
} from '../../../util/networks';
import {
  LINEA_MAINNET,
  LINEA_SEPOLIA,
  MAINNET,
  SEPOLIA,
} from '../../../constants/network';
import Button from '../../../component-library/components/Buttons/Button/Button';
import {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import Engine from '../../../core/Engine';
import { MetaMetricsEvents } from '../../../core/Analytics';
import Routes from '../../../constants/navigation/Routes';
import { NetworkListModalSelectorsIDs } from '../../../../e2e/selectors/Modals/NetworkListModal.selectors';
import { useTheme } from '../../../util/theme';
import Text from '../../../component-library/components/Texts/Text/Text';
import {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { updateIncomingTransactions } from '../../../util/transaction-controller';
import { useMetrics } from '../../../components/hooks/useMetrics';

// Internal dependencies
import styles from './NetworkSelector.styles';
import { TESTNET_TICKER_SYMBOLS } from '@metamask/controller-utils';

const NetworkSelector = () => {
  const { navigate } = useNavigation();
  const theme = useTheme();
  const { trackEvent } = useMetrics();
  const { colors } = theme;
  const sheetRef = useRef<BottomSheetRef>(null);
  const showTestNetworks = useSelector(selectShowTestNetworks);

  const providerConfig: ProviderConfig = useSelector(selectProviderConfig);
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  // The only possible value types are mainnet, linea-mainnet, sepolia and linea-sepolia
  const onNetworkChange = (type: string) => {
    const {
      NetworkController,
      CurrencyRateController,
      AccountTrackerController,
    } = Engine.context;

    let ticker = type;
    if (type === LINEA_SEPOLIA) {
      ticker = TESTNET_TICKER_SYMBOLS.LINEA_SEPOLIA;
    }
    if (type === SEPOLIA) {
      ticker = TESTNET_TICKER_SYMBOLS.SEPOLIA;
    }

    CurrencyRateController.updateExchangeRate(ticker);
    NetworkController.setProviderType(type);
    AccountTrackerController.refresh();

    setTimeout(async () => {
      await updateIncomingTransactions();
    }, 1000);

    sheetRef.current?.onCloseBottomSheet();

    trackEvent(MetaMetricsEvents.NETWORK_SWITCHED, {
      chain_id: getDecimalChainId(providerConfig.chainId),
      from_network:
        providerConfig.type === 'rpc'
          ? providerConfig.nickname
          : providerConfig.type,
      to_network: type,
    });
  };

  const onSetRpcTarget = async (rpcTarget: string) => {
    const { CurrencyRateController, NetworkController } = Engine.context;

    const entry = Object.entries(networkConfigurations).find(([, { rpcUrl }]) =>
      compareRpcUrls(rpcUrl, rpcTarget),
    );

    if (entry) {
      const [networkConfigurationId, networkConfiguration] = entry;
      const { ticker, nickname } = networkConfiguration;

      CurrencyRateController.updateExchangeRate(ticker);

      NetworkController.setActiveNetwork(networkConfigurationId);

      sheetRef.current?.onCloseBottomSheet();
      trackEvent(MetaMetricsEvents.NETWORK_SWITCHED, {
        chain_id: getDecimalChainId(providerConfig.chainId),
        from_network: providerConfig.type,
        to_network: nickname,
      });
    }
  };

  const renderMainnet = () => {
    const { name: mainnetName, chainId } = Networks.mainnet;
    return (
      <Cell
        variant={CellVariant.Select}
        title={mainnetName}
        avatarProps={{
          variant: AvatarVariant.Network,
          name: mainnetName,
          imageSource: images.ETHEREUM,
        }}
        isSelected={
          chainId === providerConfig.chainId && !providerConfig.rpcUrl
        }
        onPress={() => onNetworkChange(MAINNET)}
        style={styles.networkCell}
      />
    );
  };

  const renderLineaMainnet = () => {
    const { name: lineaMainnetName, chainId } = Networks['linea-mainnet'];
    return (
      <Cell
        variant={CellVariant.Select}
        title={lineaMainnetName}
        avatarProps={{
          variant: AvatarVariant.Network,
          name: lineaMainnetName,
          imageSource: images['LINEA-MAINNET'],
        }}
        isSelected={chainId === providerConfig.chainId}
        onPress={() => onNetworkChange(LINEA_MAINNET)}
      />
    );
  };

  const renderRpcNetworks = () =>
    Object.values(networkConfigurations).map(
      ({ nickname, rpcUrl, chainId }) => {
        if (!chainId) return null;
        const { name } = { name: nickname || rpcUrl };
        //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
        const image = getNetworkImageSource({ chainId: chainId?.toString() });

        return (
          <Cell
            key={chainId}
            variant={CellVariant.Select}
            title={name}
            avatarProps={{
              variant: AvatarVariant.Network,
              name,
              imageSource: image,
            }}
            isSelected={Boolean(
              chainId === providerConfig.chainId && providerConfig.rpcUrl,
            )}
            onPress={() => onSetRpcTarget(rpcUrl)}
            style={styles.networkCell}
          />
        );
      },
    );

  const renderOtherNetworks = () => {
    const getOtherNetworks = () => getAllNetworks().slice(2);
    return getOtherNetworks().map((networkType) => {
      // TODO: Provide correct types for network.
      const { name, imageSource, chainId } = (Networks as any)[networkType];

      return (
        <Cell
          key={chainId}
          variant={CellVariant.Select}
          title={name}
          avatarProps={{
            variant: AvatarVariant.Network,
            name,
            imageSource,
          }}
          isSelected={chainId === providerConfig.chainId}
          onPress={() => onNetworkChange(networkType)}
          style={styles.networkCell}
        />
      );
    });
  };

  const goToNetworkSettings = () => {
    sheetRef.current?.onCloseBottomSheet(() => {
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
          const { PreferencesController } = Engine.context;
          PreferencesController.setShowTestNetworks(value);
        }}
        value={isTestNet(providerConfig.chainId) || showTestNetworks}
        trackColor={{
          true: colors.primary.default,
          false: colors.border.muted,
        }}
        thumbColor={theme.brandColors.white}
        ios_backgroundColor={colors.border.muted}
        testID={NetworkListModalSelectorsIDs.TEST_NET_TOGGLE}
        disabled={isTestNet(providerConfig.chainId)}
      />
    </View>
  );

  return (
    <BottomSheet ref={sheetRef}>
      <SheetHeader title={strings('networks.select_network')} />
      <ScrollView testID={NetworkListModalSelectorsIDs.SCROLL}>
        {renderMainnet()}
        {renderLineaMainnet()}
        {renderRpcNetworks()}
        {renderTestNetworksSwitch()}
        {showTestNetworks && renderOtherNetworks()}
      </ScrollView>

      <Button
        variant={ButtonVariants.Secondary}
        label={strings('app_settings.network_add_network')}
        onPress={goToNetworkSettings}
        width={ButtonWidthTypes.Full}
        size={ButtonSize.Lg}
        style={styles.addNetworkButton}
        testID={NetworkListModalSelectorsIDs.ADD_BUTTON}
      />
    </BottomSheet>
  );
};

export default NetworkSelector;
