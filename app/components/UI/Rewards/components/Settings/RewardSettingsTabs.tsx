import React, { useCallback, useState, useMemo } from 'react';
import {
  FlatList,
  ListRenderItem,
  View,
  Pressable,
  ActivityIndicator,
} from 'react-native';
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
import { InternalAccount } from '@metamask/keyring-internal-api';
import { strings } from '../../../../../../locales/i18n';
import { TabsList } from '../../../../../component-library/components-temp/Tabs';
import AccountDisplayItem from '../AccountDisplayItem/AccountDisplayItem';
import Banner, {
  BannerVariant,
  BannerAlertSeverity,
} from '../../../../../component-library/components/Banners/Banner';
import { ButtonVariants } from '../../../../../component-library/components/Buttons/Button';
import { TabViewProps } from '../../../Perps/components/PerpsMarketTabs/PerpsMarketTabs.types';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { useRewardOptinSummary } from '../../hooks/useRewardOptinSummary';
import { useLinkAccount } from '../../hooks/useLinkAccount';

interface AccountWithOptInStatus extends InternalAccount {
  hasOptedIn: boolean;
}

interface RewardSettingsTabsProps {
  initialTabIndex: number;
}

const RewardSettingsTabs: React.FC<RewardSettingsTabsProps> = ({
  initialTabIndex,
}) => {
  // Use the new hook for opt-in summary
  const {
    linkedAccounts,
    unlinkedAccounts,
    isLoading: isLoadingOptInSummary,
    hasError: hasErrorOptInSummary,
    refresh: fetchOptInStatus,
  } = useRewardOptinSummary();
  const tw = useTailwind();

  // Local state to track accounts that have been linked but not yet refetched from server
  const [locallyLinkedAccounts, setLocallyLinkedAccounts] = useState<
    Set<string>
  >(new Set());
  // Track the specific account being linked for overlay display
  const [linkingAccount, setLinkingAccount] = useState<InternalAccount | null>(
    null,
  );
  const { linkAccount, isLoading: isLinkingAccount } = useLinkAccount();

  // Compute final account lists with local state applied
  const computedLinkedAccounts = useMemo(() => {
    // Add locally linked accounts to the linked accounts list
    const locallyLinkedAccountObjects = unlinkedAccounts.filter((account) =>
      locallyLinkedAccounts.has(account.address),
    );
    return [...linkedAccounts, ...locallyLinkedAccountObjects];
  }, [linkedAccounts, unlinkedAccounts, locallyLinkedAccounts]);

  const computedUnlinkedAccounts = useMemo(
    () =>
      // Remove locally linked accounts from the unlinked accounts list
      unlinkedAccounts.filter(
        (account) => !locallyLinkedAccounts.has(account.address),
      ),
    [unlinkedAccounts, locallyLinkedAccounts],
  );

  // Handle link account press with double-press prevention
  const handleLinkAccountPress = useCallback(
    async (account: InternalAccount) => {
      // Prevent double-press - check if this account or any account is currently linking
      if (isLinkingAccount) {
        return;
      }

      setLinkingAccount(account);

      try {
        const success = await linkAccount(account);
        if (success) {
          // Add account to local state to immediately remove from unlinked list
          setLocallyLinkedAccounts((prev) =>
            new Set(prev).add(account.address),
          );
        }
      } finally {
        setLinkingAccount(null);
      }
    },
    [isLinkingAccount, linkAccount],
  );

  // Shared account item component
  const renderAccountItem = useCallback(
    (account: AccountWithOptInStatus, showLinkButton: boolean = false) => (
      <Box
        twClassName="flex-row items-center justify-between rounded-lg"
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        <Box twClassName="flex-1">
          <AccountDisplayItem account={account} />
        </Box>

        {showLinkButton && (
          <Pressable
            disabled={isLinkingAccount}
            onPress={() => handleLinkAccountPress(account)}
            style={() =>
              tw.style(
                'px-4 py-2 rounded-lg bg-pressed min-h-[32px] justify-center items-center',
                isLinkingAccount && 'opacity-90',
              )
            }
          >
            <Box
              twClassName="flex-row items-center gap-2"
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
            >
              {linkingAccount === account ? (
                <ActivityIndicator size="small" color={tw.color('primary')} />
              ) : (
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  twClassName="text-primary"
                >
                  {strings('rewards.settings.link_account_button')}
                </Text>
              )}
            </Box>
          </Pressable>
        )}
      </Box>
    ),
    [isLinkingAccount, linkingAccount, tw, handleLinkAccountPress],
  );

  // Render individual account item for linked accounts
  const renderLinkedAccountItem: ListRenderItem<AccountWithOptInStatus> = ({
    item: account,
  }) => renderAccountItem(account, false);

  // Render individual account item for unlinked accounts
  const renderUnlinkedAccountItem: ListRenderItem<AccountWithOptInStatus> = ({
    item: account,
  }) => renderAccountItem(account, true);

  if (isLoadingOptInSummary) {
    // Create an array of unique identifiers for skeleton items
    const skeletonItems = [
      { id: 'account-skeleton-1' },
      { id: 'account-skeleton-2' },
      { id: 'account-skeleton-3' },
    ];

    return (
      <Box twClassName="gap-3">
        {skeletonItems.map((item) => (
          <Box
            key={item.id}
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
    <TabsList initialActiveIndex={initialTabIndex}>
      {/* Linked Accounts Tab */}
      <View
        key="linked"
        {...({
          tabLabel: strings('rewards.settings.tab_linked_accounts', {
            count: computedLinkedAccounts.length,
          }),
          isDisabled: isLinkingAccount,
        } as TabViewProps)}
        style={tw.style('flex-1')}
      >
        {computedLinkedAccounts.length > 0 ? (
          <FlatList
            data={computedLinkedAccounts}
            keyExtractor={(item) => item.id}
            renderItem={renderLinkedAccountItem}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={tw.style('gap-3 pt-4')}
          />
        ) : (
          <Box twClassName="py-8 items-center">
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-alternative text-center"
            >
              {strings('rewards.settings.no_linked_accounts')}
            </Text>
          </Box>
        )}
      </View>

      {/* Unlinked Accounts Tab */}
      <View
        key="unlinked"
        {...({
          tabLabel: strings('rewards.settings.tab_unlinked_accounts', {
            count: computedUnlinkedAccounts.length,
          }),
          isDisabled: false,
        } as TabViewProps)}
        style={tw.style('flex-1')}
      >
        {computedUnlinkedAccounts.length > 0 ? (
          <Box twClassName="flex-1 relative">
            <FlatList
              data={computedUnlinkedAccounts}
              keyExtractor={(item) => item.id}
              renderItem={renderUnlinkedAccountItem}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={tw.style('gap-3 pt-4')}
            />
          </Box>
        ) : (
          <Box twClassName="py-8">
            <Banner
              variant={BannerVariant.Alert}
              severity={BannerAlertSeverity.Info}
              title={strings('rewards.settings.all_accounts_linked_title')}
              description={strings(
                'rewards.settings.all_accounts_linked_description',
              )}
            />
          </Box>
        )}
      </View>
    </TabsList>
  );
};

export default RewardSettingsTabs;
