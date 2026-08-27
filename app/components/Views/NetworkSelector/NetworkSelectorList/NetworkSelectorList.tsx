import React, { useCallback, useMemo } from 'react';
import {
  type ScrollViewProps,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import {
  Box,
  FontWeight,
  Icon,
  IconColor,
  IconName as DesignSystemIconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { InfuraNetworkType } from '@metamask/controller-utils';
import type { NetworkConfiguration } from '@metamask/network-controller';
import images from 'images/image-icons';

import Cell, {
  CellVariant,
} from '../../../../component-library/components/Cells/Cell';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { TextVariant as LegacyTextVariant } from '../../../../component-library/components/Texts/Text';
import TagColored, {
  TagColor,
} from '../../../../component-library/components-temp/TagColored';
import Engine from '../../../../core/Engine';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  canDeleteNetwork,
  getAllNetworks,
  getNetworkImageSource,
  isMainNet,
  isTestNet,
  default as Networks,
} from '../../../../util/networks';
import hideKeyFromUrl from '../../../../util/hideKeyFromUrl';
import hideProtocolFromUrl from '../../../../util/hideProtocolFromUrl';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import CustomNetwork from '../../Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork';
import { PopularList } from '../../../../util/networks/customNetworks';
import { NetworkListModalSelectorsIDs } from '../NetworkListModal.testIds';
import createStyles from '../NetworkSelector.styles';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { ExtendedNetwork } from '../../Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork.types';
import type { infuraNetwork } from '../types';
import { isNonEvmChainId } from '../../../../core/Multichain/utils';
import type {
  NetworkSelectorListItem,
  NetworkSelectorListProps,
  NonEvmNetworkListConfiguration,
} from './NetworkSelectorList.types';

const keyExtractor = (item: NetworkSelectorListItem) => item.key;

const getItemType = (item: NetworkSelectorListItem) => item.type;

const NetworkSelectorList = ({
  networkConfigurations,
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  nonEvmNetworkConfigurations,
  ///: END:ONLY_INCLUDE_IF
  searchString,
  showTestNetworks,
  isSendFlow,
  isRedesignEnabled,
  showRpcSelector,
  selectedChainId,
  selectedRpcUrl,
  isEvmSelected,
  isHardwareWallet,
  avatarSize,
  showPopularNetworkModal,
  popularNetwork,
  isGasFeesSponsoredNetworkEnabled,
  isNetworkSelected,
  onSetRpcTarget,
  onNetworkChange,
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  onNonEvmNetworkChange,
  ///: END:ONLY_INCLUDE_IF
  openModal,
  openRpcModal,
  onCancel,
  toggleWarningModal,
  showNetworkModal,
  handleAddPopularNetwork,
}: NetworkSelectorListProps) => {
  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles(colors);

  const isNoSearchResults = useCallback(
    (networkIdentifier: string) => {
      if (!searchString || !networkIdentifier) {
        return false;
      }

      if (
        networkIdentifier === 'mainnet' ||
        networkIdentifier === 'linea-mainnet'
      ) {
        const network = Networks[
          networkIdentifier
        ] as unknown as ExtendedNetwork;
        return !network.name
          ?.toLowerCase()
          .includes(searchString.toLowerCase());
      }

      return !networkIdentifier.includes(searchString);
    },
    [searchString],
  );

  const renderMainnet = () => {
    const { name: mainnetName, chainId } = Networks.mainnet;
    const networkConfiguration = networkConfigurations[chainId];
    const rpcUrl =
      networkConfiguration?.rpcEndpoints[
        networkConfiguration.defaultRpcEndpointIndex
      ].url;
    const name = networkConfiguration?.name ?? mainnetName;

    if (!isRedesignEnabled) {
      return (
        <Cell
          variant={CellVariant.Select}
          title={name}
          avatarProps={{
            variant: AvatarVariant.Network,
            name: mainnetName,
            imageSource: images.ETHEREUM,
            size: avatarSize,
          }}
          isSelected={isNetworkSelected(chainId)}
          onPress={() => onNetworkChange(InfuraNetworkType.mainnet)}
          style={styles.networkCell}
        />
      );
    }

    return (
      <Cell
        variant={isSendFlow ? CellVariant.Select : CellVariant.SelectWithMenu}
        title={name}
        secondaryText={
          showRpcSelector
            ? hideProtocolFromUrl(hideKeyFromUrl(rpcUrl))
            : undefined
        }
        avatarProps={{
          variant: AvatarVariant.Network,
          name: mainnetName,
          imageSource: images.ETHEREUM,
          size: AvatarSize.Sm,
        }}
        isSelected={isNetworkSelected(chainId)}
        onPress={() => onNetworkChange(InfuraNetworkType.mainnet)}
        style={styles.networkCell}
        buttonIcon={IconName.MoreVertical}
        buttonProps={{
          onButtonClick: () =>
            openModal(chainId, false, InfuraNetworkType.mainnet, true),
        }}
        onTextClick={() => openRpcModal({ chainId, networkName: mainnetName })}
        onLongPress={() =>
          openModal(chainId, false, InfuraNetworkType.mainnet, true)
        }
      />
    );
  };

  const renderLineaMainnet = () => {
    const { name: networkName, chainId } = Networks['linea-mainnet'];
    const networkConfiguration = networkConfigurations[chainId];
    const rpcUrl =
      networkConfiguration?.rpcEndpoints[
        networkConfiguration.defaultRpcEndpointIndex
      ].url;
    const name = networkConfiguration?.name ?? networkName;

    if (!isRedesignEnabled) {
      return (
        <Cell
          variant={CellVariant.Select}
          title={name}
          avatarProps={{
            variant: AvatarVariant.Network,
            name: networkName,
            imageSource: images['LINEA-MAINNET'],
            size: avatarSize,
          }}
          isSelected={isNetworkSelected(chainId)}
          onPress={() => onNetworkChange(InfuraNetworkType['linea-mainnet'])}
        />
      );
    }

    return (
      <Cell
        variant={isSendFlow ? CellVariant.Select : CellVariant.SelectWithMenu}
        title={name}
        secondaryText={
          showRpcSelector
            ? hideProtocolFromUrl(hideKeyFromUrl(rpcUrl))
            : undefined
        }
        avatarProps={{
          variant: AvatarVariant.Network,
          name: networkName,
          imageSource: images['LINEA-MAINNET'],
          size: AvatarSize.Sm,
        }}
        isSelected={isNetworkSelected(chainId)}
        onPress={() => onNetworkChange(InfuraNetworkType['linea-mainnet'])}
        style={styles.networkCell}
        buttonIcon={IconName.MoreVertical}
        buttonProps={{
          onButtonClick: () =>
            openModal(chainId, false, InfuraNetworkType['linea-mainnet'], true),
        }}
        onTextClick={() => openRpcModal({ chainId, networkName })}
        onLongPress={() =>
          openModal(chainId, false, InfuraNetworkType['linea-mainnet'], true)
        }
      />
    );
  };

  const renderRpcNetwork = (networkConfiguration: NetworkConfiguration) => {
    const {
      name: nickname,
      rpcEndpoints,
      chainId,
      defaultRpcEndpointIndex,
    } = networkConfiguration;
    const rpcUrl = rpcEndpoints[defaultRpcEndpointIndex].url;
    const name =
      nickname || rpcEndpoints[defaultRpcEndpointIndex].name || rpcUrl;

    const image = getNetworkImageSource({ chainId: chainId.toString() });
    const isSelected = isEvmSelected && chainId === selectedChainId;

    if (!isRedesignEnabled) {
      return (
        <Cell
          testID={NetworkListModalSelectorsIDs.CUSTOM_NETWORK_CELL(name)}
          variant={CellVariant.Select}
          title={name}
          avatarProps={{
            variant: AvatarVariant.Network,
            name,
            imageSource: image,
            size: avatarSize,
          }}
          isSelected={isSelected}
          onPress={() => onSetRpcTarget(networkConfiguration)}
          style={styles.networkCell}
        >
          {isSelected && selectedRpcUrl === rpcUrl ? (
            <View testID={`${name}-selected`} />
          ) : null}
        </Cell>
      );
    }

    return (
      <Cell
        variant={isSendFlow ? CellVariant.Select : CellVariant.SelectWithMenu}
        title={
          isSendFlow ? (
            name
          ) : (
            <Box twClassName="w-full flex-row gap-2 items-center self-stretch">
              <Text
                variant={TextVariant.BodyMd}
                numberOfLines={1}
                style={styles.networkNameText}
              >
                {name}
              </Text>
              {!isHardwareWallet &&
              isGasFeesSponsoredNetworkEnabled(chainId) ? (
                <TagColored
                  color={TagColor.Success}
                  style={styles.noNetworkFeeContainer}
                  labelProps={{
                    variant: LegacyTextVariant.BodySM,
                    style: {
                      textTransform: 'none',
                      textAlign: 'center',
                      bottom: 1,
                      fontWeight: 'normal',
                    },
                  }}
                >
                  {strings('networks.no_network_fee')}
                </TagColored>
              ) : null}
            </Box>
          )
        }
        tertiaryText={
          isSendFlow &&
          !isHardwareWallet &&
          isGasFeesSponsoredNetworkEnabled(chainId)
            ? strings('networks.no_network_fee')
            : undefined
        }
        avatarProps={{
          variant: AvatarVariant.Network,
          name,
          imageSource: image,
          size: AvatarSize.Sm,
        }}
        isSelected={isSelected}
        onPress={() => onSetRpcTarget(networkConfiguration)}
        style={styles.networkCell}
        buttonIcon={IconName.MoreVertical}
        secondaryText={
          showRpcSelector
            ? hideProtocolFromUrl(hideKeyFromUrl(rpcUrl))
            : undefined
        }
        buttonProps={{
          onButtonClick: () =>
            openModal(chainId, canDeleteNetwork(chainId), rpcUrl, false),
        }}
        onTextClick={() => openRpcModal({ chainId, networkName: name })}
        onLongPress={() =>
          openModal(chainId, canDeleteNetwork(chainId), rpcUrl, false)
        }
      />
    );
  };

  const renderOtherNetwork = (networkType: InfuraNetworkType) => {
    const typedNetworks = Networks as unknown as Record<string, infuraNetwork>;
    const { name, imageSource, chainId } = typedNetworks[networkType];
    const networkConfiguration = networkConfigurations[chainId];
    const rpcUrl =
      networkConfiguration?.rpcEndpoints[
        networkConfiguration.defaultRpcEndpointIndex
      ].url;

    if (!isRedesignEnabled) {
      return (
        <Cell
          variant={CellVariant.Select}
          title={name}
          avatarProps={{
            variant: AvatarVariant.Network,
            name,
            imageSource,
            size: avatarSize,
          }}
          isSelected={isNetworkSelected(chainId)}
          onPress={() => onNetworkChange(networkType)}
          style={styles.networkCell}
        />
      );
    }

    return (
      <Cell
        variant={CellVariant.SelectWithMenu}
        secondaryText={
          showRpcSelector
            ? hideProtocolFromUrl(hideKeyFromUrl(rpcUrl))
            : undefined
        }
        title={name}
        avatarProps={{
          variant: AvatarVariant.Network,
          name,
          imageSource,
          size: AvatarSize.Sm,
        }}
        isSelected={isNetworkSelected(chainId)}
        onPress={() => onNetworkChange(networkType)}
        style={styles.networkCell}
        buttonIcon={IconName.MoreVertical}
        buttonProps={{
          onButtonClick: () => openModal(chainId, false, networkType, true),
        }}
        onTextClick={() => openRpcModal({ chainId, networkName: name })}
        onLongPress={() => openModal(chainId, false, networkType, true)}
      />
    );
  };

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const renderNonEvmNetwork = (network: NonEvmNetworkListConfiguration) => (
    <Cell
      variant={CellVariant.Select}
      title={network.name}
      avatarProps={{
        variant: AvatarVariant.Network,
        name: network.name,
        imageSource: network.imageSource,
        size: avatarSize,
      }}
      isSelected={isNetworkSelected(network.chainId)}
      onPress={() => onNonEvmNetworkChange(network.chainId)}
      style={styles.networkCell}
    />
  );
  ///: END:ONLY_INCLUDE_IF

  const renderAdditionalNetworks = () => {
    const filteredNetworks =
      searchString.length > 0
        ? PopularList.filter(({ nickname }) =>
            nickname.toLowerCase().includes(searchString.toLowerCase()),
          )
        : undefined;

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
          customNetworksList={filteredNetworks}
          showCompletionMessage={false}
          showPopularNetworkModal
          hideWarningIcons
          skipConfirmation
          onNetworkAdd={handleAddPopularNetwork}
        />
      </View>
    );
  };

  const networkListData = useMemo(() => {
    const items: NetworkSelectorListItem[] = [];

    if (isRedesignEnabled && searchString.length === 0) {
      items.push({
        type: 'enabledNetworksHeader',
        key: 'enabled-networks-header',
      });
    }

    if (!isRedesignEnabled || !isNoSearchResults('mainnet')) {
      items.push({ type: 'mainnet', key: 'mainnet' });
    }

    if (!isRedesignEnabled || !isNoSearchResults('linea-mainnet')) {
      items.push({ type: 'lineaMainnet', key: 'linea-mainnet' });
    }

    Object.values(networkConfigurations).forEach((networkConfiguration) => {
      const { chainId, defaultRpcEndpointIndex, name, rpcEndpoints } =
        networkConfiguration;
      if (
        isNonEvmChainId(chainId) ||
        isTestNet(chainId) ||
        isMainNet(chainId) ||
        chainId === CHAIN_IDS.LINEA_MAINNET ||
        chainId === CHAIN_IDS.GOERLI
      ) {
        return;
      }

      const rpcNetworkName =
        name ||
        rpcEndpoints[defaultRpcEndpointIndex].name ||
        rpcEndpoints[defaultRpcEndpointIndex].url;
      if (isRedesignEnabled && isNoSearchResults(rpcNetworkName)) {
        return;
      }

      items.push({
        type: 'rpcNetwork',
        key: `rpc-network-${chainId}`,
        networkConfiguration,
      });
    });

    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    if (!isSendFlow) {
      Object.values(nonEvmNetworkConfigurations)
        .filter((network) => !network.isTestnet)
        .forEach((networkConfiguration) => {
          items.push({
            type: 'nonEvmNetwork',
            key: `non-evm-network-${networkConfiguration.chainId}`,
            networkConfiguration,
          });
        });
    }
    ///: END:ONLY_INCLUDE_IF

    if (!isSendFlow && isRedesignEnabled && searchString.length === 0) {
      items.push({
        type: 'popularNetworksHeader',
        key: 'popular-networks-header',
      });
    }

    if (!isSendFlow && isRedesignEnabled) {
      items.push({ type: 'additionalNetworks', key: 'additional-networks' });
    }

    if (!isSendFlow && searchString.length === 0) {
      items.push({ type: 'testNetworksSwitch', key: 'test-networks-switch' });
    }

    if (!isSendFlow && showTestNetworks) {
      const networkTypes = getAllNetworks() as unknown as InfuraNetworkType[];
      networkTypes.slice(3).forEach((networkType) => {
        const typedNetworks = Networks as unknown as Record<
          string,
          infuraNetwork
        >;
        if (
          isRedesignEnabled &&
          isNoSearchResults(typedNetworks[networkType].name)
        ) {
          return;
        }

        items.push({
          type: 'otherNetwork',
          key: `other-network-${networkType}`,
          networkType,
        });
      });

      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      Object.values(nonEvmNetworkConfigurations)
        .filter((network) => network.isTestnet)
        .forEach((networkConfiguration) => {
          items.push({
            type: 'nonEvmNetwork',
            key: `non-evm-test-network-${networkConfiguration.chainId}`,
            networkConfiguration,
          });
        });
      ///: END:ONLY_INCLUDE_IF
    }

    return items;
  }, [
    isRedesignEnabled,
    isSendFlow,
    networkConfigurations,
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    nonEvmNetworkConfigurations,
    ///: END:ONLY_INCLUDE_IF
    isNoSearchResults,
    searchString,
    showTestNetworks,
  ]);

  const renderItem = ({
    item,
  }: ListRenderItemInfo<NetworkSelectorListItem>) => {
    switch (item.type) {
      case 'enabledNetworksHeader':
        return (
          <View style={styles.switchContainer}>
            <Text
              variant={TextVariant.BodyLg}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >
              {strings('networks.enabled_networks')}
            </Text>
          </View>
        );
      case 'mainnet':
        return renderMainnet();
      case 'lineaMainnet':
        return renderLineaMainnet();
      case 'rpcNetwork':
        return renderRpcNetwork(item.networkConfiguration);
      case 'nonEvmNetwork':
        return renderNonEvmNetwork(item.networkConfiguration);
      case 'popularNetworksHeader':
        return (
          <View style={styles.popularNetworkTitleContainer}>
            <Text
              variant={TextVariant.BodyLg}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >
              {strings('networks.additional_networks')}
            </Text>
            <TouchableOpacity
              testID={NetworkListModalSelectorsIDs.TOOLTIP}
              style={styles.gasInfoContainer}
              onPress={toggleWarningModal}
              hitSlop={styles.hitSlop}
            >
              <Icon
                name={DesignSystemIconName.Info}
                size={IconSize.Sm}
                color={IconColor.IconAlternative}
              />
            </TouchableOpacity>
          </View>
        );
      case 'additionalNetworks':
        return renderAdditionalNetworks();
      case 'testNetworksSwitch':
        return (
          <View style={styles.switchContainer}>
            <Text
              variant={TextVariant.BodyLg}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >
              {strings('networks.show_test_networks')}
            </Text>
            <Switch
              onValueChange={(value) =>
                Engine.context.PreferencesController.setShowTestNetworks(value)
              }
              value={isTestNet(selectedChainId) || showTestNetworks}
              trackColor={{
                true: colors.primary.default,
                false: colors.border.muted,
              }}
              thumbColor={theme.brandColors.white}
              ios_backgroundColor={colors.border.muted}
              testID={NetworkListModalSelectorsIDs.TEST_NET_TOGGLE}
              disabled={isTestNet(selectedChainId)}
            />
          </View>
        );
      case 'otherNetwork':
        return renderOtherNetwork(item.networkType);
      default:
        return null;
    }
  };

  return (
    <FlashList
      data={networkListData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemType={getItemType}
      style={styles.scrollableDescription}
      keyboardShouldPersistTaps="handled"
      testID={NetworkListModalSelectorsIDs.SCROLL}
      renderScrollComponent={ScrollView as React.ComponentType<ScrollViewProps>}
      maintainVisibleContentPosition={{ disabled: true }}
      removeClippedSubviews
    />
  );
};

export default NetworkSelectorList;
