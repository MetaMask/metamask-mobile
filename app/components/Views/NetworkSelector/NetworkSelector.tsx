/* eslint-disable @typescript-eslint/no-explicit-any */
// Third party dependencies.
import React, { useRef, useState } from 'react';
import { Linking, Switch, TextInput, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import images from 'images/image-icons';
import { useNavigation } from '@react-navigation/native';
import { ProviderConfig } from '@metamask/network-controller';

// External dependencies.
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import Cell, {
  CellVariant,
} from '../../../component-library/components/Cells/Cell';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';
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
  isNetworkUiRedesignEnabled,
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
import createStyles from './NetworkSelector.styles';
import { TESTNET_TICKER_SYMBOLS } from '@metamask/controller-utils';
import InfoModal from '../../../../app/components/UI/Swaps/components/InfoModal';
import hideKeyFromUrl from '../../../util/hideKeyFromUrl';
import CustomNetwork from '../Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork';
import { NetworksViewSelectorsIDs } from '../../../../e2e/selectors/Settings/NetworksView.selectors';
import { PopularList } from '../../../util/networks/customNetworks';
import Icon from 'react-native-vector-icons/Ionicons';

const NetworkSelector = () => {
  const [showPopularNetworkModal, setShowPopularNetworkModal] = useState(false);
  const [popularNetwork, setPopularNetwork] = useState(undefined);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [searchString, setSearchString] = useState('');
  const { navigate } = useNavigation();
  const theme = useTheme();
  const { trackEvent } = useMetrics();
  const { colors } = theme;
  const styles = createStyles(colors);
  const sheetRef = useRef<BottomSheetRef>(null);
  const showTestNetworks = useSelector(selectShowTestNetworks);

  const providerConfig: ProviderConfig = useSelector(selectProviderConfig);
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const avatarSize = isNetworkUiRedesignEnabled ? AvatarSize.Sm : undefined;

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
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const filterNetworksByName = (networks: any[], networkName: string) => {
    const searchResult: any = networks.filter(({ name }) =>
      name.toLowerCase().includes(networkName.toLowerCase()),
    );

    return searchResult;
  };

  const isNoSearchResults = (networkIdenfier: string) => {
    if (!searchString || !networkIdenfier) {
      return false;
    }

    if (networkIdenfier === MAINNET || networkIdenfier === LINEA_MAINNET) {
      return (
        filterNetworksByName([Networks[networkIdenfier]], searchString)
          .length === 0
      );
    }

    return !networkIdenfier.includes(searchString);
  };

  const renderMainnet = () => {
    const { name: mainnetName, chainId } = Networks.mainnet;

    if (isNetworkUiRedesignEnabled && isNoSearchResults(MAINNET)) return null;

    return (
      <Cell
        variant={CellVariant.Select}
        title={mainnetName}
        avatarProps={{
          variant: AvatarVariant.Network,
          name: mainnetName,
          imageSource: images.ETHEREUM,
          size: avatarSize,
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

    if (isNetworkUiRedesignEnabled && isNoSearchResults('linea-mainnet'))
      return null;

    return (
      <Cell
        variant={CellVariant.Select}
        title={lineaMainnetName}
        avatarProps={{
          variant: AvatarVariant.Network,
          name: lineaMainnetName,
          imageSource: images['LINEA-MAINNET'],
          size: avatarSize,
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

        if (isNetworkUiRedesignEnabled && isNoSearchResults(name)) return null;

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
              size: avatarSize,
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
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { name, imageSource, chainId } = (Networks as any)[networkType];

      if (isNetworkUiRedesignEnabled && isNoSearchResults(name)) return null;

      return (
        <Cell
          key={chainId}
          variant={CellVariant.Select}
          title={name}
          avatarProps={{
            variant: AvatarVariant.Network,
            name,
            imageSource,
            size: avatarSize,
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

  const renderAdditonalNetworks = () => {
    let filteredNetworks;

    if (isNetworkUiRedesignEnabled && searchString.length > 0)
      filteredNetworks = PopularList.filter(({ nickname }) =>
        nickname.toLowerCase().includes(searchString.toLowerCase()),
      );

    return (
      <View style={styles.addtionalNetworksContainer}>
        <CustomNetwork
          isNetworkModalVisible={showPopularNetworkModal}
          closeNetworkModal={onCancel}
          selectedNetwork={popularNetwork}
          toggleWarningModal={toggleWarningModal}
          showNetworkModal={showNetworkModal}
          switchTab={undefined}
          shouldNetworkSwitchPopToWallet={false}
          customNetworksList={
            searchString.length > 0 ? filteredNetworks : undefined
          }
          showCompletionMessage={false}
        />
      </View>
    );
  };

  const renderTitle = (title: string) => (
    <View style={styles.switchContainer}>
      <Text variant={TextVariant.BodyLGMedium} color={TextColor.Alternative}>
        {strings(title)}
      </Text>
    </View>
  );

  const handleSearchTextChange = (text: any) => {
    setSearchString(text);
  };

  const clearSearchInput = () => {
    setSearchString('');
  };

  const renderBottomSheetContent = () => (
    <>
      <SheetHeader title={strings('networks.select_network')} />
      <ScrollView testID={NetworkListModalSelectorsIDs.SCROLL}>
        {isNetworkUiRedesignEnabled && (
          <View style={styles.inputWrapper}>
            <Icon name="ios-search" size={20} color={colors.icon.default} />
            <TextInput
              style={styles.input}
              placeholder={strings('networks.search')}
              placeholderTextColor={colors.text.default}
              value={searchString}
              onChangeText={handleSearchTextChange}
              testID={NetworksViewSelectorsIDs.SEARCH_NETWORK_INPUT_BOX_ID}
            />
            {searchString.length > 0 && (
              <Icon
                name="ios-close"
                size={20}
                color={colors.icon.default}
                onPress={clearSearchInput}
                testID={NetworksViewSelectorsIDs.CLOSE_ICON}
              />
            )}
          </View>
        )}
        {isNetworkUiRedesignEnabled &&
          searchString.length === 0 &&
          renderTitle('networks.enabled_networks')}
        {renderMainnet()}
        {renderLineaMainnet()}
        {renderRpcNetworks()}
        {isNetworkUiRedesignEnabled &&
          searchString.length === 0 &&
          renderTitle('networks.additional_networks')}
        {isNetworkUiRedesignEnabled && renderAdditonalNetworks()}
        {searchString.length === 0 && renderTestNetworksSwitch()}
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
    </>
  );

  return (
    <BottomSheet ref={sheetRef}>
      {isNetworkUiRedesignEnabled ? (
        <View style={styles.networkListContainer}>
          {renderBottomSheetContent()}
        </View>
      ) : (
        renderBottomSheetContent()
      )}

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
