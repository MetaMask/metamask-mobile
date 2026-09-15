// third party dependencies
import { ImageSourcePropType, TouchableOpacity, View } from 'react-native';
import React, { useCallback, useMemo } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { CaipChainId, parseCaipChainId } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { useSelector } from 'react-redux';
import { formatChainIdToCaip } from '@metamask/bridge-controller';

// external dependencies
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';
import { useStyles } from '../../../component-library/hooks/useStyles';
import Cell, {
  CellVariant,
} from '../../../component-library/components/Cells/Cell';
import { AvatarVariant } from './../../../component-library/components/Avatars/Avatar';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import { isTestNet } from '../../../util/networks';
import Routes from '../../../constants/navigation/Routes';
import { selectEvmChainId } from '../../../selectors/networkController';
import {
  selectIsEvmNetworkSelected,
  selectSelectedNonEvmNetworkChainId,
} from '../../../selectors/multichainNetworkController';
import { selectShowFiatInTestnets } from '../../../selectors/settings';
import hideProtocolFromUrl from '../../../util/hideProtocolFromUrl';
import hideKeyFromUrl from '../../../util/hideKeyFromUrl';
import {
  useNetworksByNamespace,
  NetworkType,
} from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useNetworksToUse } from '../../hooks/useNetworksToUse/useNetworksToUse';
import AccountGroupBalancePerChain from '../Assets/components/Balance/AccountGroupBalancePerChain';
// internal dependencies
import createStyles from './CustomNetworkSelector.styles';

import {
  CustomNetworkItem,
  CustomNetworkSelectorProps,
} from './CustomNetworkSelector.types';
import { NETWORK_MULTI_SELECTOR_TEST_IDS } from '../NetworkMultiSelector/NetworkMultiSelector.constants';
import { isNonEvmChainId } from '../../../core/Multichain/utils';
import {
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';

const CustomNetworkSelector = ({
  openModal,
  dismissModal,
  openRpcModal,
  onLocalNetworkSelect,
  localSelectedChainIds,
}: CustomNetworkSelectorProps) => {
  const { colors } = useTheme();
  const { styles } = useStyles(createStyles, {});
  const { navigate } = useNavigation<AppNavigationProp>();
  const safeAreaInsets = useSafeAreaInsets();

  // Get the currently active network's chain ID in CAIP format
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const evmChainId = useSelector(selectEvmChainId);
  const nonEvmChainId = useSelector(selectSelectedNonEvmNetworkChainId);
  const selectedChainIdCaip = useMemo(
    () =>
      isEvmSelected
        ? formatChainIdToCaip(evmChainId)
        : (nonEvmChainId ?? formatChainIdToCaip(evmChainId)),
    [isEvmSelected, evmChainId, nonEvmChainId],
  );

  // Use custom hooks for network management
  const { networks, areAllNetworksSelected } = useNetworksByNamespace({
    networkType: NetworkType.Custom,
  });

  const { networksToUse } = useNetworksToUse({
    networks,
    networkType: NetworkType.Custom,
    areAllNetworksSelected,
  });

  // Checkmarks always reflect the caller's local (Redux-free) selection -
  // same source of truth as the popular-networks tab. Selecting an
  // already-added custom network here never touches
  // NetworkEnablementController.
  const displayNetworksToUse = useMemo(
    () =>
      networksToUse.map((network) => ({
        ...network,
        isSelected: Boolean(
          localSelectedChainIds?.includes(network.caipChainId),
        ),
      })),
    [networksToUse, localSelectedChainIds],
  );

  const selectCustomNetwork = useCallback(
    (caipChainId: CaipChainId, onComplete?: () => void) => {
      onLocalNetworkSelect([caipChainId]);
      onComplete?.();
    },
    [onLocalNetworkSelect],
  );

  const showFiatOnTestnets = useSelector(selectShowFiatInTestnets);

  const goToNetworkSettings = useCallback(() => {
    navigate(Routes.ADD_NETWORK, {
      shouldNetworkSwitchPopToWallet: false,
      shouldShowPopularNetworks: false,
    });
  }, [navigate]);

  const createAvatarProps = useCallback(
    (item: CustomNetworkItem) => ({
      variant: AvatarVariant.Network as const,
      name: item.name,
      imageSource: item.imageSource as ImageSourcePropType,
    }),
    [],
  );

  const renderNetworkItem: ListRenderItem<CustomNetworkItem> = useCallback(
    ({ item }) => {
      const {
        name,
        caipChainId,
        networkTypeOrRpcUrl,
        isSelected,
        hasMultipleRpcs,
      } = item;
      const rawChainId = parseCaipChainId(caipChainId).reference;
      const chainId = isNonEvmChainId(caipChainId)
        ? rawChainId
        : toHex(rawChainId);

      const handlePress = async () => {
        await selectCustomNetwork(caipChainId, dismissModal);
      };

      const handleMenuPress = () => {
        // Don't allow deleting testnets. Deleting the active network is
        // allowed - NetworkManager switches away from it first (see
        // isActiveNetwork below).
        openModal({
          isVisible: true,
          caipChainId,
          displayEdit: !isTestNet(chainId),
          isActiveNetwork: selectedChainIdCaip === caipChainId,
          networkTypeOrRpcUrl: networkTypeOrRpcUrl || '',
          isReadOnly: false,
        });
      };

      return (
        <View>
          <Cell
            variant={CellVariant.SelectWithMenu}
            isSelected={isSelected}
            title={name}
            secondaryText={
              networkTypeOrRpcUrl && hasMultipleRpcs
                ? hideProtocolFromUrl(hideKeyFromUrl(networkTypeOrRpcUrl))
                : undefined
            }
            onPress={handlePress}
            onTextClick={() =>
              openRpcModal && openRpcModal({ chainId, networkName: name })
            }
            avatarProps={createAvatarProps(item)}
            buttonIcon={IconName.MoreVertical}
            buttonProps={{
              onButtonClick: handleMenuPress,
            }}
            testID={NETWORK_MULTI_SELECTOR_TEST_IDS.NETWORK_LIST_ITEM(
              caipChainId,
              isSelected,
            )}
          >
            {(!isTestNet(chainId) || showFiatOnTestnets) && (
              <AccountGroupBalancePerChain caipChainId={caipChainId} />
            )}
          </Cell>
        </View>
      );
    },
    [
      selectCustomNetwork,
      openModal,
      dismissModal,
      openRpcModal,
      createAvatarProps,
      selectedChainIdCaip,
      showFiatOnTestnets,
    ],
  );

  const renderFooter = useCallback(
    () => (
      <TouchableOpacity
        style={styles.addNetworkButtonContainer}
        onPress={goToNetworkSettings}
      >
        <View style={styles.iconContainer}>
          <Icon
            name={IconName.Add}
            size={IconSize.Md}
            color={colors.primary.default}
          />
        </View>

        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.PrimaryDefault}
          fontWeight={FontWeight.Medium}
        >
          {strings('app_settings.network_add_custom_network')}
        </Text>
      </TouchableOpacity>
    ),
    [goToNetworkSettings, colors, styles],
  );

  return (
    <ScrollView
      testID={NETWORK_MULTI_SELECTOR_TEST_IDS.CUSTOM_NETWORKS_CONTAINER}
      style={styles.container}
    >
      <FlashList
        data={displayNetworksToUse}
        renderItem={renderNetworkItem}
        keyExtractor={(item) => item.caipChainId}
        ListFooterComponent={renderFooter}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingBottom: safeAreaInsets.bottom,
        }}
      />
    </ScrollView>
  );
};

export default CustomNetworkSelector;
