import React, {
  useCallback,
  useRef,
  useEffect,
  useState,
  useMemo,
} from 'react';
import { FlatList, ListRenderItem, View, Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSelector } from 'react-redux';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
  Icon,
  IconName,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  IconSize,
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
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
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
  const unlinkedAccountsListRef = useRef<FlatList>(null);

  // Local state to track accounts that have been linked but not yet refetched from server
  const [locallyLinkedAccounts, setLocallyLinkedAccounts] = useState<
    Set<string>
  >(new Set());
  // Track the specific account being linked for overlay display
  const [linkingAccount, setLinkingAccount] = useState<InternalAccount | null>(
    null,
  );
  const selectedAccount = useSelector(selectSelectedInternalAccount);
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

  // Scroll to current account in unlinked accounts list when tab becomes active
  const scrollToCurrentAccountInUnlinkedList = useCallback(() => {
    if (!selectedAccount || !computedUnlinkedAccounts.length) return;

    const currentAccountIndex = computedUnlinkedAccounts.findIndex(
      (account: InternalAccount) => account.address === selectedAccount.address,
    );

    if (currentAccountIndex >= 0 && unlinkedAccountsListRef.current) {
      // Add small delay to ensure the list is rendered
      setTimeout(() => {
        unlinkedAccountsListRef.current?.scrollToIndex({
          index: currentAccountIndex,
          animated: true,
          viewPosition: 0.5, // Center the item in the view
        });
      }, 100);
    }
  }, [selectedAccount, computedUnlinkedAccounts]);

  // Scroll to current account when unlinked accounts change
  useEffect(() => {
    if (!isLoadingOptInSummary && !hasErrorOptInSummary) {
      scrollToCurrentAccountInUnlinkedList();
    }
  }, [
    isLoadingOptInSummary,
    hasErrorOptInSummary,
    scrollToCurrentAccountInUnlinkedList,
  ]);

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
    (account: AccountWithOptInStatus, showLinkButton: boolean = false) => {
      const isCurrentAccount = selectedAccount?.address === account.address;

      return (
        <Box
          twClassName="flex-row items-center justify-between px-3 rounded-lg"
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
        >
          <Box twClassName="flex-1">
            <AccountDisplayItem
              account={account}
              twClassName="p-3"
              isCurrentAccount={isCurrentAccount}
            />
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
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  twClassName="text-primary"
                >
                  {strings('rewards.settings.link_account_button')}
                </Text>
              </Box>
            </Pressable>
          )}
        </Box>
      );
    },
    [selectedAccount, isLinkingAccount, handleLinkAccountPress, tw],
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
            showsVerticalScrollIndicator
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
              ref={unlinkedAccountsListRef}
              data={computedUnlinkedAccounts}
              keyExtractor={(item) => item.id}
              renderItem={renderUnlinkedAccountItem}
              showsVerticalScrollIndicator
              onScrollToIndexFailed={() => {
                // Do nothing
              }}
              contentContainerStyle={tw.style('gap-3 pt-4')}
            />

            {/* Linking Account Overlay */}
            {linkingAccount && (
              <Box
                twClassName="absolute inset-0 w-full h-full bg-pressed opacity-80 justify-center items-center"
                style={tw.style('z-50')}
              >
                <Box
                  twClassName="items-center gap-4"
                  alignItems={BoxAlignItems.Center}
                >
                  <Icon name={IconName.Loading} size={IconSize.Md} />
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                    twClassName="text-primary text-center"
                  >
                    {strings('rewards.linking_account', {
                      accountName: linkingAccount.metadata.name,
                    })}
                  </Text>
                </Box>
              </Box>
            )}
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
