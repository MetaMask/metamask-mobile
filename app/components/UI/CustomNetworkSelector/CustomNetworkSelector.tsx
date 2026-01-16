// third party dependencies
import { ImageSourcePropType, ScrollViewProps, View } from 'react-native';
import TouchableOpacity from '../../Base/TouchableOpacity';
import React, { useCallback, useMemo } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { parseCaipChainId } from '@metamask/utils';
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
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { isTestNet } from '../../../util/networks';
import Routes from '../../../constants/navigation/Routes';
import { selectEvmChainId } from '../../../selectors/networkController';
import {
  selectIsEvmNetworkSelected,
  selectSelectedNonEvmNetworkChainId,
} from '../../../selectors/multichainNetworkController';
import hideProtocolFromUrl from '../../../util/hideProtocolFromUrl';
import hideKeyFromUrl from '../../../util/hideKeyFromUrl';
import {
  useNetworksByNamespace,
  NetworkType,
} from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useNetworkSelection } from '../../hooks/useNetworkSelection/useNetworkSelection';
import { useNetworksToUse } from '../../hooks/useNetworksToUse/useNetworksToUse';

// internal dependencies
import createStyles from './CustomNetworkSelector.styles';
import {
  CustomNetworkItem,
  CustomNetworkSelectorProps,
} from './CustomNetworkSelector.types';
import { NETWORK_MULTI_SELECTOR_TEST_IDS } from '../NetworkMultiSelector/NetworkMultiSelector.constants';
import { isNonEvmChainId } from '../../../core/Multichain/utils';

const CustomNetworkSelector = ({
  openModal,
  dismissModal,
  openRpcModal,
}: CustomNetworkSelectorProps) => {
  const { colors } = useTheme();
  const { styles } = useStyles(createStyles, {});
  const { navigate } = useNavigation();
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

  const { selectCustomNetwork } = useNetworkSelection({
    networks: networksToUse,
  });

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
        // Don't allow deleting the active network or testnets
        const isActiveNetwork = selectedChainIdCaip === caipChainId;
        openModal({
          isVisible: true,
          caipChainId,
          displayEdit: !isTestNet(chainId) && !isActiveNetwork,
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
            style={styles.networkItem}
          />
        </View>
      );
    },
    [
      selectCustomNetwork,
      openModal,
      dismissModal,
      openRpcModal,
      createAvatarProps,
      styles.networkItem,
      selectedChainIdCaip,
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

        <Text variant={TextVariant.BodyMDMedium} color={colors.primary.default}>
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
        data={networksToUse}
        renderItem={renderNetworkItem}
        keyExtractor={(item) => item.caipChainId}
        ListFooterComponent={renderFooter}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingBottom: safeAreaInsets.bottom,
        }}
        renderScrollComponent={
          ScrollView as React.ComponentType<ScrollViewProps>
        }
      />
    </ScrollView>
  );
};

export default CustomNetworkSelector;
