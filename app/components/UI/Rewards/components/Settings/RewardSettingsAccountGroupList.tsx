import React, { useCallback, useMemo } from 'react';
import { FlatList } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Banner, {
  BannerVariant,
  BannerAlertSeverity,
} from '../../../../../component-library/components/Banners/Banner';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import {
  AccountGroupWithOptInStatus,
  useRewardOptinSummary,
  WalletWithAccountGroupsWithOptInStatus,
} from '../../hooks/useRewardOptinSummary';
import { selectAvatarAccountType } from '../../../../../selectors/settings';
import { selectIconSeedAddressByAccountGroupId } from '../../../../../selectors/multichainAccounts/accounts';
import { ButtonVariants } from '../../../../../component-library/components/Buttons/Button';
import { useRewardsAccountGroupModal } from '../../context/RewardsModalProvider';
import RewardSettingsAccountGroup from './RewardSettingsAccountGroup';

interface RewardSettingsAccountGroupListProps {
  initialTabIndex: number;
}

const RewardSettingsAccountGroupList: React.FC<
  RewardSettingsAccountGroupListProps
> = () => {
  const tw = useTailwind();

  // Move all expensive operations to parent component
  const avatarAccountType = useSelector(selectAvatarAccountType);
  const { showAccountGroupModal } = useRewardsAccountGroupModal();

  const {
    byWallet,
    isLoading: isLoadingOptInSummary,
    hasError: hasErrorOptInSummary,
    refresh: fetchOptInStatus,
  } = useRewardOptinSummary();

  // Optimized keyExtractor function (moved before early returns)
  const keyExtractor = useCallback(
    (item: WalletWithAccountGroupsWithOptInStatus) =>
      `wallet-${item.wallet?.metadata?.name || 'Unknown'}`,
    [],
  );

  // Create a memoized selector factory for EVM addresses
  const evmAddressSelectors = useMemo(() => {
    const selectors: Record<string, (state: RootState) => string | undefined> =
      {};
    byWallet.forEach((walletItem) => {
      walletItem.groups.forEach((accountGroup) => {
        if (!selectors[accountGroup.id]) {
          selectors[accountGroup.id] = (state: RootState) => {
            try {
              const selector = selectIconSeedAddressByAccountGroupId(
                accountGroup.id,
              );
              return selector(state);
            } catch (error) {
              return undefined;
            }
          };
        }
      });
    });
    return selectors;
  }, [byWallet]);

  // Use selectors to get all EVM addresses at once
  const evmAddresses = useSelector((state: RootState) => {
    const addresses: Record<string, string | undefined> = {};
    Object.entries(evmAddressSelectors).forEach(([id, selector]) => {
      addresses[id] = selector(state);
    });
    return addresses;
  });

  // Memoized function to get account status text
  const getAccountStatusText = useCallback(
    (accountGroup: AccountGroupWithOptInStatus) => {
      const totalAccounts =
        accountGroup.optedInAccounts.length +
        accountGroup.optedOutAccounts.length;
      const key =
        accountGroup.optedInAccounts.length === 1
          ? 'rewards.settings.account_link_status.linked_singular'
          : 'rewards.settings.account_link_status.linked_plural';
      return strings(key, {
        count: accountGroup.optedInAccounts.length,
        total: totalAccounts,
      });
    },
    [],
  );

  // Memoized callback factory for linking account groups
  const createLinkHandler = useCallback(
    (accountGroup: AccountGroupWithOptInStatus) => () => {
      // Open modal with autoLink mode - toaster logic now handled by modal
      showAccountGroupModal(accountGroup.id, true);
    },
    [showAccountGroupModal],
  );

  // Memoized callback factory for showing addresses
  const createShowAddressesHandler = useCallback(
    (accountGroup: AccountGroupWithOptInStatus) => () => {
      showAccountGroupModal(accountGroup.id, false);
    },
    [showAccountGroupModal],
  );

  // Memoized render function with pre-computed data
  const renderWalletWithAccountGroups = useCallback(
    ({
      walletItem,
    }: {
      walletItem: WalletWithAccountGroupsWithOptInStatus;
    }) => (
      <Box
        key={`${walletItem.wallet?.metadata?.name || 'Unknown'}`}
        twClassName="gap-4"
      >
        <Box
          twClassName="flex-row items-center justify-between px-3"
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            twClassName="text-alternative"
          >
            {walletItem.wallet?.metadata?.name || 'Unknown Wallet'}
          </Text>
        </Box>
        <Box twClassName="gap-3">
          {walletItem.groups.map((accountGroup) => (
            <RewardSettingsAccountGroup
              key={accountGroup.id}
              accountGroup={accountGroup}
              evmAddress={evmAddresses[accountGroup.id]}
              avatarAccountType={avatarAccountType}
              accountStatusText={getAccountStatusText(accountGroup)}
              totalAccounts={
                accountGroup.optedInAccounts.length +
                accountGroup.optedOutAccounts.length
              }
              isLinkable={accountGroup.optedOutAccounts.length > 0}
              onLinkAccountGroup={createLinkHandler(accountGroup)}
              onShowAddresses={createShowAddressesHandler(accountGroup)}
            />
          ))}
        </Box>
      </Box>
    ),
    [
      evmAddresses,
      avatarAccountType,
      getAccountStatusText,
      createLinkHandler,
      createShowAddressesHandler,
    ],
  );

  if (isLoadingOptInSummary) {
    return (
      <Box twClassName="gap-3">
        {[...Array(3)].map((_, index) => (
          <Box
            key={index}
            twClassName="flex-row items-center gap-3 py-3 px-4 rounded-lg"
          >
            <Skeleton height={40} width={40} style={tw.style('rounded-full')} />
            <Skeleton height={20} width={120} />
          </Box>
        ))}
      </Box>
    );
  }

  if (hasErrorOptInSummary) {
    return (
      <Box twClassName="py-8">
        <Banner
          variant={BannerVariant.Alert}
          severity={BannerAlertSeverity.Error}
          title={strings('rewards.settings.error_title')}
          description={strings('rewards.settings.error_description')}
          actionButtonProps={{
            variant: ButtonVariants.Link,
            label: strings('rewards.settings.error_retry'),
            onPress: () => {
              fetchOptInStatus();
            },
          }}
        />
      </Box>
    );
  }

  // Tab-based account list
  return (
    <FlatList
      data={byWallet}
      keyExtractor={keyExtractor}
      renderItem={({ item }) =>
        renderWalletWithAccountGroups({ walletItem: item })
      }
      showsVerticalScrollIndicator
      contentContainerStyle={tw.style('gap-6 pt-4')}
      removeClippedSubviews
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={10}
      updateCellsBatchingPeriod={50}
    />
  );
};

export default RewardSettingsAccountGroupList;
