import React, { useCallback, useMemo, memo, useState } from 'react';
import { useSelector } from 'react-redux';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  ButtonBase,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { useRewardOptinSummary } from '../../hooks/useRewardOptinSummary';
import { selectAvatarAccountType } from '../../../../../selectors/settings';
import { selectInternalAccountsByGroupId } from '../../../../../selectors/multichainAccounts/accounts';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import RewardSettingsAccountGroup from './RewardSettingsAccountGroup';
import RewardSettingsOptOut from './RewardSettingsOptOut';
import ReferredByCodeSection from './ReferredByCodeSection';
import { RewardSettingsAccountGroupListFlatListItem } from './types';
import RewardsErrorBanner from '../RewardsErrorBanner';
import { useBulkLinkState } from '../../hooks/useBulkLinkState';
import { useTheme } from '../../../../../util/theme';

const INITIAL_ACCOUNTS_TO_SHOW = 2;

// Separate component for progress section to prevent header remounting on progress updates
interface AccountProgressSectionProps {
  linkedAccounts: number;
  totalAccounts: number;
  isLoading?: boolean;
}

const AccountProgressSection: React.FC<AccountProgressSectionProps> = memo(
  ({ linkedAccounts, totalAccounts, isLoading }) => {
    const tw = useTailwind();
    const { colors } = useTheme();

    // Get bulk link state directly in this component to avoid parent re-renders
    const {
      isRunning: isBulkLinkRunning,
      linkedAccounts: bulkLinkLinkedAccounts,
      totalAccounts: bulkLinkTotalAccounts,
      accountProgress: bulkLinkProgress,
      startBulkLink,
    } = useBulkLinkState();

    const rawProgress = isBulkLinkRunning
      ? bulkLinkProgress
      : totalAccounts > 0
        ? linkedAccounts / totalAccounts
        : 0;

    // Ensure progress is always a valid number between 0 and 1
    const progress = Number.isFinite(rawProgress)
      ? Math.min(1, Math.max(0, rawProgress))
      : 0;

    const progressPercent = Math.round(progress * 100);

    // Show skeleton when loading and no data available yet
    const showSkeleton = isLoading && totalAccounts === 0 && !isBulkLinkRunning;

    // Show add all button when not all accounts are linked and bulk link is not running
    const showAddAllButton =
      !isLoading &&
      !isBulkLinkRunning &&
      totalAccounts > 0 &&
      linkedAccounts < totalAccounts;

    if (showSkeleton) {
      return (
        <Box testID="rewards-settings-bulk-link-progress" twClassName="gap-2">
          <Skeleton height={22} width={120} style={tw.style('rounded')} />
          <Skeleton height={8} width="100%" style={tw.style('rounded-full')} />
        </Box>
      );
    }

    return (
      <Box testID="rewards-settings-bulk-link-progress" twClassName="gap-2">
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          alignItems={BoxAlignItems.Center}
        >
          {isBulkLinkRunning ? (
            <>
              <Text
                testID="rewards-settings-account-status"
                variant={TextVariant.BodySm}
                twClassName="text-alternative"
              >
                {strings('rewards.settings.linking_progress', {
                  current: bulkLinkLinkedAccounts,
                  total: bulkLinkTotalAccounts,
                })}
              </Text>
              <Text variant={TextVariant.BodySm} twClassName="text-alternative">
                {progressPercent}%
              </Text>
            </>
          ) : (
            <Text variant={TextVariant.BodySm} twClassName="text-alternative">
              {strings('rewards.settings.accounts_linked_count', {
                linked: linkedAccounts,
                total: totalAccounts,
              })}
            </Text>
          )}
        </Box>
        {/* Progress bar */}
        <Box
          testID="rewards-settings-progress-bar"
          twClassName="w-full h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: colors.background.alternative }}
        >
          <Box
            twClassName="h-full rounded-full"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: colors.primary.default,
            }}
          />
        </Box>
        {/* Add all accounts button */}
        {showAddAllButton && (
          <Button
            testID="rewards-settings-add-all-button"
            variant={ButtonVariants.Primary}
            label={strings('rewards.settings.add_all_accounts')}
            onPress={startBulkLink}
            width={null as unknown as number}
            style={tw.style('mt-2')}
          />
        )}
      </Box>
    );
  },
);

const RewardSettingsAccountGroupList: React.FC = () => {
  const tw = useTailwind();

  // State to track which wallets are expanded
  const [expandedWallets, setExpandedWallets] = useState<Set<string>>(
    new Set(),
  );

  // Move all expensive operations to parent component
  const avatarAccountType = useSelector(selectAvatarAccountType);

  const {
    byWallet,
    isLoading: isLoadingOptInSummary,
    hasError: hasErrorOptInSummary,
    refresh: fetchOptInStatus,
  } = useRewardOptinSummary();

  // Get the memoized selector function once - this is properly memoized by reselect
  const getAccountsByGroupId = useSelector(selectInternalAccountsByGroupId);

  // Compute addresses map with useMemo to avoid creating new objects on every render
  const allAddresses = useMemo(() => {
    const addresses: Record<string, string[]> = {};
    const allGroups = byWallet.flatMap((walletItem) => walletItem.groups);

    allGroups.forEach((accountGroup) => {
      try {
        const accounts = getAccountsByGroupId(accountGroup.id);
        addresses[accountGroup.id] = accounts
          .map((account) => account.address)
          .filter(Boolean);
      } catch {
        addresses[accountGroup.id] = [];
      }
    });

    return addresses;
  }, [byWallet, getAccountsByGroupId]);

  // Calculate total and linked accounts from byWallet
  const { totalAccounts, linkedAccounts } = useMemo(() => {
    let total = 0;
    let linked = 0;

    byWallet.forEach((walletItem) => {
      walletItem.groups.forEach((group) => {
        const groupTotal =
          group.optedInAccounts.length + group.optedOutAccounts.length;
        total += groupTotal;
        linked += group.optedInAccounts.length;
      });
    });

    return { totalAccounts: total, linkedAccounts: linked };
  }, [byWallet]);

  // Toggle expanded state for a wallet
  const toggleWalletExpanded = useCallback((walletId: string) => {
    setExpandedWallets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(walletId)) {
        newSet.delete(walletId);
      } else {
        newSet.add(walletId);
      }
      return newSet;
    });
  }, []);

  const renderFlatListItem: ListRenderItem<RewardSettingsAccountGroupListFlatListItem> =
    useCallback(
      ({ item }) => {
        switch (item.type) {
          case 'wallet':
            return (
              <Box
                testID={`wallet-header-${
                  item.walletItem?.wallet?.id?.replace('keyring:', '') ||
                  'unknown'
                }`}
                twClassName="flex-row items-center justify-between py-2 px-4"
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Between}
              >
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  twClassName="text-alternative"
                >
                  {item.walletItem?.wallet?.metadata?.name || 'Unknown Wallet'}
                </Text>
              </Box>
            );
          case 'accountGroup': {
            return (
              <RewardSettingsAccountGroup
                testID={`account-group-${item.accountGroup?.id || 'unknown'}`}
                item={item}
                avatarAccountType={avatarAccountType}
              />
            );
          }
          case 'showMore': {
            const isExpanded = item.isExpanded;
            const walletId = item.walletId || '';
            return (
              <ButtonBase
                testID={`show-more-button-${walletId}`}
                twClassName="bg-background-default"
                style={({ pressed }) =>
                  tw.style(pressed && 'bg-background-pressed')
                }
                onPress={() => toggleWalletExpanded(walletId)}
              >
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  justifyContent={BoxJustifyContent.Center}
                  twClassName="gap-2"
                >
                  <Text
                    variant={TextVariant.BodySm}
                    fontWeight={FontWeight.Medium}
                    twClassName="text-text-alternative"
                  >
                    {isExpanded
                      ? strings('rewards.settings.show_less')
                      : strings('rewards.settings.show_more') +
                        ` (${item.remainingCount})`}
                  </Text>
                  <Icon
                    name={isExpanded ? IconName.ArrowUp : IconName.ArrowDown}
                    size={IconSize.Xs}
                    color={IconColor.IconAlternative}
                  />
                </Box>
              </ButtonBase>
            );
          }
          default:
            return null;
        }
      },
      [avatarAccountType, toggleWalletExpanded, tw],
    );

  const getItemType = useCallback(
    (item: RewardSettingsAccountGroupListFlatListItem) => item.type,
    [],
  );

  const keyExtractor = useCallback(
    (item: RewardSettingsAccountGroupListFlatListItem, index: number) => {
      if (item.type === 'wallet' && item.walletItem) {
        return `wallet-${
          item.walletItem.wallet?.id?.replace('keyring:', '') || index
        }`;
      }

      if (item.type === 'accountGroup' && item.accountGroup) {
        return `accountGroup-${item.accountGroup.id}`;
      }

      if (item.type === 'showMore' && item.walletId) {
        return `showMore-${item.walletId}`;
      }

      return `item-${index}`;
    },
    [],
  );

  const ListHeaderComponent = useCallback(
    () => (
      <Box testID="rewards-settings-header" twClassName="gap-4 px-4 py-2">
        <Box twClassName="gap-2">
          <Text variant={TextVariant.HeadingMd}>
            {strings('rewards.settings.subtitle')}
          </Text>

          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            {strings('rewards.settings.description')}
          </Text>

          <AccountProgressSection
            linkedAccounts={linkedAccounts}
            totalAccounts={totalAccounts}
            isLoading={isLoadingOptInSummary}
          />
        </Box>
      </Box>
    ),
    [linkedAccounts, totalAccounts, isLoadingOptInSummary],
  );

  const ListFooterComponent = useCallback(
    () => (
      <Box>
        <ReferredByCodeSection />
        <RewardSettingsOptOut />
      </Box>
    ),
    [],
  );

  // Flatten data for FlatList with collapse/expand support
  const flattenedData =
    useMemo((): RewardSettingsAccountGroupListFlatListItem[] => {
      const items: RewardSettingsAccountGroupListFlatListItem[] = [];

      byWallet.forEach((walletItem) => {
        const walletId =
          walletItem.wallet?.id?.replace('keyring:', '') || 'unknown';
        const isExpanded = expandedWallets.has(walletId);
        const totalGroups = walletItem.groups.length;
        const hasMoreThanInitial = totalGroups > INITIAL_ACCOUNTS_TO_SHOW;

        // Add wallet header
        items.push({
          type: 'wallet',
          walletItem,
        });

        // Add account groups (limited if not expanded)
        const groupsToShow = isExpanded
          ? walletItem.groups
          : walletItem.groups.slice(0, INITIAL_ACCOUNTS_TO_SHOW);

        groupsToShow.forEach((accountGroup) => {
          items.push({
            type: 'accountGroup',
            accountGroup,
            allAddresses: allAddresses?.[accountGroup.id] || [],
          });
        });

        // Add "Show more/less" button if there are more than initial accounts
        if (hasMoreThanInitial) {
          items.push({
            type: 'showMore',
            walletId,
            remainingCount: totalGroups - INITIAL_ACCOUNTS_TO_SHOW,
            isExpanded,
          });
        }
      });

      return items;
    }, [byWallet, allAddresses, expandedWallets]);

  if (isLoadingOptInSummary) {
    return (
      <Box testID="rewards-settings-loading" twClassName="gap-4">
        <ListHeaderComponent />

        <Box twClassName="gap-3 px-4">
          {[...Array(3)].map((_, index) => (
            <Box
              key={`rewards-settings-skeleton-${index}`}
              testID={`rewards-settings-skeleton-${index}`}
              twClassName="flex-row items-center gap-3 py-2 rounded-lg"
            >
              <Skeleton
                height={40}
                width={40}
                style={tw.style('rounded-full')}
              />
              <Skeleton height={20} width={120} />
            </Box>
          ))}
        </Box>

        <ListFooterComponent />
      </Box>
    );
  }

  if (hasErrorOptInSummary) {
    return (
      <Box testID="rewards-settings-error" twClassName="gap-4">
        <ListHeaderComponent />

        <Box twClassName="px-4">
          <RewardsErrorBanner
            testID="rewards-settings-error-banner"
            title={strings(
              'rewards.accounts_opt_in_state_error.error_fetching_title',
            )}
            description={strings(
              'rewards.accounts_opt_in_state_error.error_fetching_description',
            )}
            onConfirm={() => {
              fetchOptInStatus();
            }}
            confirmButtonLabel={strings(
              'rewards.accounts_opt_in_state_error.retry_button',
            )}
          />
        </Box>

        <ListFooterComponent />
      </Box>
    );
  }

  // Account list using FlashList for better performance
  return (
    <FlashList
      testID="rewards-settings-flash-list"
      data={flattenedData}
      renderItem={renderFlatListItem}
      keyExtractor={keyExtractor}
      getItemType={getItemType}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      keyboardShouldPersistTaps="handled"
    />
  );
};

// Memoize the component to prevent unnecessary re-renders
const MemoizedRewardSettingsAccountGroupList = memo(
  RewardSettingsAccountGroupList,
);

export default MemoizedRewardSettingsAccountGroupList;
