// Third party dependencies.
import { ProviderConfig } from '@metamask/network-controller';
import { useNavigation } from '@react-navigation/native';
import images from 'images/image-icons';
import React, { useRef, useState } from 'react';
import { Linking, Switch, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
// External dependencies.
import { useSelector } from 'react-redux';
import { NetworkListModalSelectorsIDs } from '../../../../e2e/selectors/Modals/NetworkListModal.selectors';
import { strings } from '../../../../locales/i18n';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import Button from '../../../component-library/components/Buttons/Button/Button';
import Cell, {
  CellVariant,
} from '../../../component-library/components/Cells/Cell';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Text from '../../../component-library/components/Texts/Text/Text';
import { useMetrics } from '../../../components/hooks/useMetrics';
import Routes from '../../../constants/navigation/Routes';
import {
  LINEA_MAINNET,
  LINEA_SEPOLIA,
  MAINNET,
  SEPOLIA,
} from '../../../constants/network';
import { MetaMetricsEvents } from '../../../core/Analytics';
import Engine from '../../../core/Engine';
import {
  selectNetworkConfigurations,
  selectProviderConfig,
} from '../../../selectors/networkController';
import { selectShowTestNetworks } from '../../../selectors/preferencesController';
import Networks, {
  compareRpcUrls,
  getAllNetworks,
  getDecimalChainId,
  getNetworkImageSource,
  isNetworkUiRedesignEnabled,
  isTestNet,
} from '../../../util/networks';
import { useTheme } from '../../../util/theme';
import { updateIncomingTransactions } from '../../../util/transaction-controller';

// Internal dependencies
import { TESTNET_TICKER_SYMBOLS } from '@metamask/controller-utils';
import InfoModal from '../../../../app/components/UI/Swaps/components/InfoModal';
import hideKeyFromUrl from '../../../util/hideKeyFromUrl';
import CustomNetwork from '../Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork';
import createStyles from './NetworkSelector.styles';

const NetworkSelector = () => {
  const [showPopularNetworkModal, setShowPopularNetworkModal] = useState(false);
  const [popularNetwork, setPopularNetwork] = useState(undefined);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const { navigate } = useNavigation();
  const theme = useTheme();
  const { trackEvent } = useMetrics();
  const { colors } = theme;
  const styles = createStyles(colors);
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

  // TODO: type the any below to import { Network } from './CustomNetwork.types';
  const showNetworkModal = (networkConfiguration: any) => {
    setShowPopularNetworkModal(true);
    setPopularNetwork({
      ...networkConfiguration,
      formattedRpcUrl: networkConfiguration.warning
        ? null
        : hideKeyFromUrl(networkConfiguration.rpcUrl),
    });
  };

  const onCancel = () => {
    setShowPopularNetworkModal(false);
    setPopularNetwork(undefined);
  };

  const toggleWarningModal = () => {
    setShowWarningModal(!showWarningModal);
  };
  const goToLearnMore = () => {
    Linking.openURL(strings('networks.learn_more_url'));
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
          size: AvatarSize.Sm,
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
          size: AvatarSize.Sm,
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
              size: AvatarSize.Sm,
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
            size: AvatarSize.Sm,
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

  const renderAdditonalNetworks = () => (
    <View style={styles.addtionalNetworksContainer}>
      <CustomNetwork
        isNetworkModalVisible={showPopularNetworkModal}
        closeNetworkModal={onCancel}
        selectedNetwork={popularNetwork}
        toggleWarningModal={toggleWarningModal}
        showNetworkModal={showNetworkModal}
        switchTab={undefined}
        shouldNetworkSwitchPopToWallet={false}
      />
    </View>
  );

  const renderTitle = (title: string) => (
    <View style={styles.switchContainer}>
      <Text variant={TextVariant.BodyLGMedium} color={TextColor.Alternative}>
        {strings(title)}
      </Text>
    </View>
  );

  return (
    <BottomSheet ref={sheetRef}>
      <SheetHeader title={strings('networks.select_network')} />
      <ScrollView testID={NetworkListModalSelectorsIDs.SCROLL}>
        {isNetworkUiRedesignEnabled && renderTitle('networks.enabled_networks')}
        {renderMainnet()}
        {renderLineaMainnet()}
        {renderRpcNetworks()}
        {isNetworkUiRedesignEnabled &&
          renderTitle('networks.additional_networks')}
        {isNetworkUiRedesignEnabled && renderAdditonalNetworks()}
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
      {showWarningModal ? (
        <InfoModal
          isVisible={showWarningModal}
          title={strings('networks.network_warning_title')}
          body={
            <Text>
              <Text style={styles.desc}>
                {strings('networks.network_warning_desc')}
              </Text>{' '}
              <Text style={[styles.blueText]} onPress={goToLearnMore}>
                {strings('networks.learn_more')}
              </Text>
            </Text>
          }
          toggleModal={toggleWarningModal}
        />
      ) : null}
    </BottomSheet>
  );
};

export default NetworkSelector;
