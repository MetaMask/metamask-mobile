import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
  Button,
  ButtonVariant,
  ButtonSize,
  IconName,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import MultichainAddressRow from '../../../../../component-library/components-temp/MultichainAccounts/MultichainAddressRow';
import { Icon as IconType } from '../../../../../component-library/components-temp/MultichainAccounts/MultichainAddressRow/MultichainAddressRow.types';
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
import ClipboardManager from '../../../../../core/ClipboardManager';

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

  const renderAddressItem = useCallback(
    ({ item }: { item: FlattenedAddressItem }) => {
      if (!item?.address || !item?.scope) {
        return null;
      }

      const isUnsupported = item.isSupported === false;

      // Determine status icon based on account state:
      // - Check icon (✓) if the address has opted in
      // - Close icon (✗) if the address has NOT opted in yet
      // - Warning icon (⚠) if the address type is unsupported
      const statusIcon: IconType = {
        name: isUnsupported
          ? IconName.Warning
          : item.hasOptedIn
          ? IconName.Check
          : IconName.Close,
        callback: () => {
          // Status indicator - non-interactive
        },
        testId: `status-icon-${item.address}-${item.scope}`,
      };

      const copyAddressToClipboard = async () => {
        await ClipboardManager.setString(item.address);
      };

      return (
        <MultichainAddressRow
          testID={`flat-list-item-${item.address}-${item.scope}`}
          chainId={item.scope}
          networkName={item.networkName}
          address={item.address}
          copyParams={{
            successMessage: strings('multichain_accounts.address_list.copied'),
            callback: copyAddressToClipboard,
          }}
          icons={[statusIcon]}
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

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack={false}
      onClose={handleDismiss}
    >
      {Boolean(accountGroupContext?.metadata?.name) && (
        <BottomSheetHeader>
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {`${accountGroupContext?.metadata?.name} / ${strings(
              'rewards.link_account_group.linked_accounts',
            )}`}
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

      <Box twClassName="gap-2">
        {flattenedAddressData.length > 0 && (
          <FlatList
            testID="reward-opt-in-address-list"
            data={flattenedAddressData}
            keyExtractor={(item) => `${item.address}-${item.scope}`}
            renderItem={renderAddressItem}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews
          />
        )}
      </Box>

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
