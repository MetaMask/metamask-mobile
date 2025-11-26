// Third party dependencies.
import React, {
  useCallback,
  useMemo,
  useRef,
  memo,
  startTransition,
  useEffect,
} from 'react';
import { useSelector } from 'react-redux';
import { ImageSourcePropType, View } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import {
  parseCaipChainId,
  CaipChainId,
  KnownCaipNamespace,
} from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { debounce } from 'lodash';

// External dependencies.
import { useStyles } from '../../../component-library/hooks/index.ts';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar/index.ts';
import { IconName } from '../../../component-library/components/Icons/Icon/index.ts';
import Cell, {
  CellVariant,
} from '../../../component-library/components/Cells/Cell/index.ts';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text/index.ts';
import { isTestNet } from '../../../util/networks/index.js';
import Device from '../../../util/device/index.js';
import { selectChainId } from '../../../selectors/networkController';
import hideProtocolFromUrl from '../../../util/hideProtocolFromUrl';
import hideKeyFromUrl from '../../../util/hideKeyFromUrl';

// Internal dependencies.
import {
  NetworkMultiSelectorListProps,
  Network,
  NetworkListItem,
  AdditionalNetworkSection,
  NetworkListItemType,
  SelectAllNetworksListItem,
} from './NetworkMultiSelectorList.types.ts';
import styleSheet from './NetworkMultiSelectorList.styles';
import {
  MAIN_CHAIN_IDS,
  DEVICE_HEIGHT_MULTIPLIER,
  ADDITIONAL_NETWORK_SECTION_ID,
  ITEM_TYPE_ADDITIONAL_SECTION,
  ITEM_TYPE_NETWORK,
  SELECT_ALL_NETWORKS_SECTION_ID,
} from './NetworkMultiSelectorList.constants';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { NETWORK_MULTI_SELECTOR_TEST_IDS } from '../NetworkMultiSelector/NetworkMultiSelector.constants';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts/index.ts';
import { getGasFeesSponsoredNetworkEnabled } from '../../../selectors/featureFlagController/gasFeesSponsored/index.ts';
import { strings } from '../../../../locales/i18n';

const SELECTION_DEBOUNCE_DELAY = 150;

interface ProcessedNetwork extends Network {
  chainId: string;
  namespace: string;
  isMainChain: boolean;
  isTestNetwork: boolean;
}

const NetworkMultiSelectList = ({
  onSelectNetwork,
  networks = [],
  isLoading = false,
  selectedChainIds,
  renderRightAccessory,
  isSelectionDisabled,
  isAutoScrollEnabled = true,
  additionalNetworksComponent,
  selectAllNetworksComponent,
  openModal,
  areAllNetworksSelected,
  openRpcModal,
  ...props
}: NetworkMultiSelectorListProps) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const networkListRef = useRef<any>(null);
  const networksLengthRef = useRef<number>(0);
  const safeAreaInsets = useSafeAreaInsets();
  const selectedChainId = useSelector(selectChainId);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const selectedChainIdCaip = formatChainIdToCaip(selectedChainId);
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );
  const isGasFeesSponsoredNetworkEnabled = useSelector(
    getGasFeesSponsoredNetworkEnabled,
  );

  const { styles } = useStyles(styleSheet, {});

  const processedNetworks = useMemo(
    (): ProcessedNetwork[] =>
      networks.map((network) => {
        const parsedCaipChainId = parseCaipChainId(network.caipChainId);
        const chainId =
          parsedCaipChainId.namespace === KnownCaipNamespace.Eip155
            ? toHex(parsedCaipChainId.reference)
            : parsedCaipChainId.reference;

        return {
          ...network,
          chainId,
          namespace: parsedCaipChainId.namespace,
          isMainChain: MAIN_CHAIN_IDS.has(chainId),
          isTestNetwork: Boolean(chainId && isTestNet(chainId)),
          isSelected: areAllNetworksSelected ? false : network.isSelected,
        };
      }),
    [areAllNetworksSelected, networks],
  );

  const combinedData: NetworkListItem[] = useMemo(() => {
    const data: NetworkListItem[] = [];
    const filteredNetworks = processedNetworks.filter(
      (network) => !network.isTestNetwork,
    );

    if (filteredNetworks.length > 0) {
      data.push(...filteredNetworks);
    }

    if (
      (selectAllNetworksComponent && isEvmSelected) ||
      isMultichainAccountsState2Enabled
    ) {
      data.unshift({
        id: SELECT_ALL_NETWORKS_SECTION_ID,
        type: NetworkListItemType.SelectAllNetworksListItem,
        component: selectAllNetworksComponent,
      } as SelectAllNetworksListItem);
    }

    if (additionalNetworksComponent) {
      data.push({
        id: ADDITIONAL_NETWORK_SECTION_ID,
        type: NetworkListItemType.AdditionalNetworkSection,
        component: additionalNetworksComponent,
      } as AdditionalNetworkSection);
    }

    return data;
  }, [
    processedNetworks,
    additionalNetworksComponent,
    selectAllNetworksComponent,
    isEvmSelected,
    isMultichainAccountsState2Enabled,
  ]);

  const contentContainerStyle = useMemo(
    () => ({
      paddingBottom:
        safeAreaInsets.bottom +
        Device.getDeviceHeight() * DEVICE_HEIGHT_MULTIPLIER,
    }),
    [safeAreaInsets.bottom],
  );

  const debouncedSelectNetwork = useMemo(
    () =>
      debounce(
        (caipChainId: CaipChainId) => {
          if (!onSelectNetwork) return;

          startTransition(() => {
            onSelectNetwork(caipChainId);
          });
        },
        SELECTION_DEBOUNCE_DELAY,
        {
          leading: true,
          trailing: false,
        },
      ),
    [onSelectNetwork],
  );

  useEffect(
    () => () => debouncedSelectNetwork.cancel(),
    [debouncedSelectNetwork],
  );

  const getKeyExtractor = useCallback((item: NetworkListItem) => {
    if (
      'type' in item &&
      item.type === NetworkListItemType.AdditionalNetworkSection
    ) {
      return ADDITIONAL_NETWORK_SECTION_ID;
    }
    return (item as ProcessedNetwork).id;
  }, []);

  const getItemType = useCallback((item: NetworkListItem) => {
    if (
      'type' in item &&
      item.type === NetworkListItemType.AdditionalNetworkSection
    ) {
      return ITEM_TYPE_ADDITIONAL_SECTION;
    }
    return ITEM_TYPE_NETWORK;
  }, []);

  const isAdditionalNetworkSection = useCallback(
    (item: NetworkListItem): item is AdditionalNetworkSection =>
      'type' in item &&
      item.type === NetworkListItemType.AdditionalNetworkSection,
    [],
  );

  const isSelectAllNetworksSection = useCallback(
    (item: NetworkListItem): item is SelectAllNetworksListItem =>
      'type' in item &&
      item.type === NetworkListItemType.SelectAllNetworksListItem,
    [],
  );

  const createAvatarProps = useCallback(
    (network: ProcessedNetwork) => ({
      variant: AvatarVariant.Network as const,
      name: network.name,
      imageSource: network.imageSource as ImageSourcePropType,
      size: AvatarSize.Md,
    }),
    [],
  );

  const createButtonProps = useCallback(
    (network: ProcessedNetwork) => ({
      onButtonClick: () => {
        openModal({
          isVisible: true,
          caipChainId: network.caipChainId,
          displayEdit:
            selectedChainIdCaip !== network.caipChainId && !network.isMainChain,
          networkTypeOrRpcUrl: network.networkTypeOrRpcUrl || '',
          isReadOnly: false,
        });
      },
    }),
    [openModal, selectedChainIdCaip],
  );

  const renderNetworkItem: ListRenderItem<NetworkListItem> = useCallback(
    ({ item }) => {
      if (isAdditionalNetworkSection(item)) {
        return <View>{item.component}</View>;
      }

      if (isSelectAllNetworksSection(item)) {
        return <View>{item.component}</View>;
      }

      const network = item as ProcessedNetwork;
      const {
        caipChainId,
        name,
        isSelected,
        networkTypeOrRpcUrl,
        chainId,
        hasMultipleRpcs,
      } = network;

      const isDisabled = isLoading || isSelectionDisabled;
      const showButtonIcon = Boolean(networkTypeOrRpcUrl);

      const isGasSponsored = isGasFeesSponsoredNetworkEnabled(chainId);

      return (
        <View>
          <Cell
            variant={CellVariant.SelectWithMenu}
            isSelected={isSelected}
            title={
              isGasSponsored ? (
                <Box twClassName="flex-col">
                  <Text variant={TextVariant.BodyMD}>{name}</Text>
                  <Text
                    variant={TextVariant.BodySM}
                    color={TextColor.Alternative}
                  >
                    {strings('networks.no_network_fee')}
                  </Text>
                </Box>
              ) : (
                name
              )
            }
            secondaryText={
              networkTypeOrRpcUrl && hasMultipleRpcs
                ? hideProtocolFromUrl(hideKeyFromUrl(networkTypeOrRpcUrl))
                : undefined
            }
            onPress={() => debouncedSelectNetwork(caipChainId)}
            onTextClick={() =>
              openRpcModal && openRpcModal({ chainId, networkName: name })
            }
            avatarProps={createAvatarProps(network)}
            buttonIcon={IconName.MoreVertical}
            disabled={isDisabled}
            showButtonIcon={showButtonIcon}
            buttonProps={createButtonProps(network)}
            style={styles.centeredNetworkCell}
            testID={NETWORK_MULTI_SELECTOR_TEST_IDS.NETWORK_LIST_ITEM(
              caipChainId,
              isSelected,
            )}
          >
            {renderRightAccessory?.(caipChainId, name)}
          </Cell>
        </View>
      );
    },
    [
      isAdditionalNetworkSection,
      isLoading,
      isSelectionDisabled,
      debouncedSelectNetwork,
      renderRightAccessory,
      createAvatarProps,
      createButtonProps,
      isSelectAllNetworksSection,
      openRpcModal,
      isGasFeesSponsoredNetworkEnabled,
      styles.centeredNetworkCell,
    ],
  );

  const onContentSizeChanged = useCallback(() => {
    if (!networks.length || !isAutoScrollEnabled) return;
    if (networksLengthRef.current !== networks.length) {
      const selectedNetwork = networks.find(({ isSelected }) => isSelected);
      networkListRef?.current?.scrollToOffset({
        offset: selectedNetwork?.yOffset ?? 0,
        animated: false,
      });
      networksLengthRef.current = networks.length;
    }
  }, [networks, isAutoScrollEnabled]);

  return (
    <FlashList
      style={styles.networkList}
      ref={networkListRef}
      onContentSizeChange={onContentSizeChanged}
      data={combinedData}
      keyExtractor={getKeyExtractor}
      renderItem={renderNetworkItem}
      getItemType={getItemType}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={contentContainerStyle}
      removeClippedSubviews
      viewabilityConfig={{
        waitForInteraction: true,
        itemVisiblePercentThreshold: 50,
        minimumViewTime: 100,
      }}
      {...props}
    />
  );
};

export default memo(NetworkMultiSelectList);
