import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { FlatList } from 'react-native-gesture-handler';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { AccountGroupId } from '@metamask/account-api';
import { selectAccountGroupById } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import { strings } from '../../../../../../locales/i18n';
import { useLinkAccountGroup } from '../../hooks/useLinkAccountGroup';
import RewardsInfoBanner from '../RewardsInfoBanner';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import { selectNonEvmNetworkConfigurationsByChainId } from '../../../../../selectors/multichainNetworkController';
import { CaipChainId } from '@metamask/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { isTestNet } from '../../../../../util/networks';
import { MultichainAddressRow } from '../../../../../component-library/components-temp/MultichainAccounts';

interface RouteParams {
  accountGroupId: AccountGroupId;
  addressData: AddressItem[];
}

interface AddressItem {
  address: string;
  hasOptedIn: boolean;
  scopes: string[];
  isSupported?: boolean;
}

interface FlattenedAddressItem {
  address: string;
  hasOptedIn: boolean;
  scope: CaipChainId;
  networkName: string;
  isSupported?: boolean;
}

const RewardOptInAccountGroupModal: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { accountGroupId, addressData } = route.params as RouteParams;
  const { height: screenHeight } = useWindowDimensions();

  const listStyle = useMemo(
    () => ({ maxHeight: screenHeight * 0.65 }),
    [screenHeight],
  );

  const accountGroupContext = useSelector((state: RootState) =>
    selectAccountGroupById(state, accountGroupId),
  );
  const evmNetworks = useSelector(selectEvmNetworkConfigurationsByChainId);
  const nonEvmNetworks = useSelector(
    selectNonEvmNetworkConfigurationsByChainId,
  );
  const { linkAccountGroup, isLoading } = useLinkAccountGroup();
  const sheetRef = useRef<BottomSheetRef>(null);

  // Local state to track succeeded/failed accounts from linkAccountGroup operations
  const [localAccountStatuses, setLocalAccountStatuses] = useState<
    Record<string, boolean>
  >({});

  const handleDismiss = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Build a lookup of all networks by CAIP chain ID
  const allNetworks = useMemo(() => {
    const networks: Record<CaipChainId, { name: string; hexChainId?: string }> =
      {};

    // Add EVM networks
    Object.entries(evmNetworks || {}).forEach(([hexChainId, networkConfig]) => {
      if (networkConfig?.name && typeof hexChainId === 'string') {
        try {
          const caipChainId = toEvmCaipChainId(hexChainId as `0x${string}`);
          networks[caipChainId] = {
            name: networkConfig.name,
            hexChainId,
          };
        } catch (error) {
          console.warn('Invalid EVM chain ID:', hexChainId, error);
        }
      }
    });

    // Add non-EVM networks (including Solana, Bitcoin, etc.)
    Object.entries(nonEvmNetworks || {}).forEach(([chainId, networkConfig]) => {
      if (typeof chainId === 'string' && networkConfig?.name) {
        const caipChainId = chainId as CaipChainId;
        networks[caipChainId] = {
          name: networkConfig.name,
        };
      }
    });

    return networks;
  }, [evmNetworks, nonEvmNetworks]);

  // Flatten address data: create one item per address+scope combination
  const flattenedAddressData = useMemo(() => {
    const flattened: FlattenedAddressItem[] = [];

    addressData.forEach((item) => {
      if (!item?.address || !Array.isArray(item.scopes)) {
        return;
      }

      const updatedHasOptedIn =
        localAccountStatuses[item.address] ?? item.hasOptedIn;

      item.scopes.forEach((scope: string) => {
        if (typeof scope !== 'string' || !scope.trim()) {
          return;
        }

        const caipScope = scope as CaipChainId;

        // Handle wildcard patterns (e.g., "eip155:*" or "bip122:0")
        if (caipScope.includes(':*') || caipScope.endsWith(':0')) {
          const scopeParts = caipScope.split(':');
          if (scopeParts.length < 2) {
            console.warn('Invalid CAIP scope format:', caipScope);
            return;
          }

          const namespace = scopeParts[0];
          if (!namespace) {
            return;
          }

          // Add all networks matching this namespace (excluding testnets)
          Object.entries(allNetworks).forEach(([chainId, network]) => {
            const chainIdParts = chainId.split(':');
            if (chainIdParts.length < 2) {
              return;
            }

            const chainIdNamespace = chainIdParts[0];

            if (chainIdNamespace === namespace) {
              // Skip testnets for EVM networks
              if (network.hexChainId && isTestNet(network.hexChainId)) {
                return;
              }

              flattened.push({
                address: item.address,
                hasOptedIn: updatedHasOptedIn,
                scope: chainId as CaipChainId,
                networkName: network.name,
                isSupported: item.isSupported,
              });
            }
          });
        } else {
          // Specific network scope
          const network = allNetworks[caipScope];
          if (network) {
            flattened.push({
              address: item.address,
              hasOptedIn: updatedHasOptedIn,
              scope: caipScope,
              networkName: network.name,
              isSupported: item.isSupported,
            });
          } else {
            console.warn('Unknown network for scope:', caipScope);
          }
        }
      });
    });

    return flattened;
  }, [addressData, localAccountStatuses, allNetworks]);

  const handleLinkAccountGroup = useCallback(async () => {
    try {
      const result = await linkAccountGroup(accountGroupId);
      // Update local state with the results from linkAccountGroup
      setLocalAccountStatuses((prev) => ({
        ...prev,
        ...result.byAddress,
      }));
    } catch (error) {
      // Error handling is already done in the hook
      console.error('Failed to link account group:', error);
    }
  }, [linkAccountGroup, accountGroupId]);

  const renderItem = useCallback(
    ({
      item,
    }: {
      item:
        | { type: 'header'; title: string }
        | ({ type: 'item' } & FlattenedAddressItem);
    }) => {
      if (item.type === 'header') {
        return (
          <Box twClassName="px-4 py-2">
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              twClassName="text-alternative"
            >
              {item.title}
            </Text>
          </Box>
        );
      }

      if (!item.address || !item.scope) {
        return null;
      }

      return (
        <MultichainAddressRow
          testID={`flat-list-item-${item.address}-${item.scope}`}
          chainId={item.scope}
          networkName={item.networkName}
          address={item.address}
        />
      );
    },
    [],
  );

  const unsupportedAddresses = useMemo(
    () =>
      flattenedAddressData?.filter((item) => item.isSupported === false) ?? [],
    [flattenedAddressData],
  );

  const canOptInAddresses = useMemo(
    () =>
      flattenedAddressData?.filter(
        (item) => item.isSupported === true && !item.hasOptedIn,
      ) ?? [],
    [flattenedAddressData],
  );

  // Flatten addresses with section headers for FlatList
  const flatListData = useMemo(() => {
    const supportedAddresses = flattenedAddressData.filter(
      (item) => item.isSupported !== false,
    );

    const trackedAddresses = supportedAddresses.filter(
      (item) => item.hasOptedIn,
    );
    const untrackedAddresses = supportedAddresses.filter(
      (item) => !item.hasOptedIn,
    );

    const data: (
      | { type: 'header'; title: string }
      | ({ type: 'item' } & FlattenedAddressItem)
    )[] = [];

    // Only show headers if there are both tracked and untracked addresses
    const showHeaders =
      trackedAddresses.length > 0 && untrackedAddresses.length > 0;

    if (trackedAddresses.length > 0) {
      if (showHeaders) {
        data.push({
          type: 'header',
          title: strings('rewards.link_account_group.tracked'),
        });
      }
      trackedAddresses.forEach((item) => {
        data.push({ type: 'item', ...item });
      });
    }

    if (untrackedAddresses.length > 0) {
      if (showHeaders) {
        data.push({
          type: 'header',
          title: strings('rewards.link_account_group.untracked'),
        });
      }
      untrackedAddresses.forEach((item) => {
        data.push({ type: 'item', ...item });
      });
    }

    return data;
  }, [flattenedAddressData]);

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack={false}
      onClose={handleDismiss}
    >
      {Boolean(accountGroupContext?.metadata?.name) && (
        <BottomSheetHeader>
          <Text variant={TextVariant.HeadingSm}>
            {accountGroupContext?.metadata?.name}
          </Text>
        </BottomSheetHeader>
      )}

      {unsupportedAddresses.length > 0 && (
        <Box twClassName="px-4 pb-4">
          <RewardsInfoBanner
            title={strings(
              'rewards.onboarding.not_supported_account_type_title',
            )}
            description={strings(
              'rewards.onboarding.not_supported_account_type_description',
            )}
            testID="unsupported-accounts-banner"
          />
        </Box>
      )}

      {flatListData.length > 0 && (
        <FlatList
          testID="reward-opt-in-address-list"
          style={listStyle}
          data={flatListData}
          keyExtractor={(item, index) =>
            item.type === 'header'
              ? `header-${item.title}-${index}`
              : `${item.address}-${item.scope}-${index}`
          }
          renderItem={renderItem}
          showsVerticalScrollIndicator
        />
      )}

      {canOptInAddresses.length > 0 && (
        <Box twClassName="px-4 gap-2 pt-2">
          <Button
            testID="link-account-group-button"
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isLoading={isLoading}
            onPress={handleLinkAccountGroup}
            twClassName="w-full"
          >
            {strings('rewards.link_account_group.link_account')}
          </Button>
        </Box>
      )}
    </BottomSheet>
  );
};

export default RewardOptInAccountGroupModal;
