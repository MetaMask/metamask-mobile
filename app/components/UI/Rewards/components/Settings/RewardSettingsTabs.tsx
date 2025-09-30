import React, { useCallback, memo, useState } from 'react';
import { FlatList, ListRenderItem, View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  Button,
  ButtonSize,
  ButtonVariant,
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
import RewardsInfoBanner from '../RewardsInfoBanner';
import RewardsErrorBanner from '../RewardsErrorBanner';
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

// Memoized component for linked accounts - no button, just display
const LinkedAccountItem = memo(
  ({ account }: { account: AccountWithOptInStatus }) => (
    <Box
      twClassName="flex-row items-center justify-between rounded-lg"
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
    >
      <Box twClassName="flex-1">
        <AccountDisplayItem account={account} />
      </Box>
    </Box>
  ),
  (prevProps, nextProps) =>
    // Only re-render if the account ID or hasOptedIn status changes
    prevProps.account.id === nextProps.account.id &&
    prevProps.account.hasOptedIn === nextProps.account.hasOptedIn,
);

// Memoized component for unlinked accounts - includes the link button
const UnlinkedAccountItem = memo(
  ({
    account,
    onSuccess,
  }: {
    account: AccountWithOptInStatus;
    onSuccess: () => void;
  }) => {
    const { linkAccount, isLoading: isLinkingAccount } = useLinkAccount();

    const handleLinkAccount = useCallback(async () => {
      const success = await linkAccount(account);
      if (success) {
        onSuccess();
      }
    }, [account, onSuccess, linkAccount]);

    return (
      <Box
        twClassName="flex-row items-center justify-between rounded-lg"
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        <Box twClassName="flex-1">
          <AccountDisplayItem account={account} />
        </Box>

        <Button
          variant={ButtonVariant.Secondary}
          isLoading={isLinkingAccount}
          size={ButtonSize.Md}
          disabled={isLinkingAccount}
          onPress={handleLinkAccount}
        >
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {strings('rewards.settings.link_account_button')}
          </Text>
        </Button>
      </Box>
    );
  },
  (prevProps, nextProps) =>
    // Only re-render if the account ID changes or onSuccess function changes
    // Note: onSuccess should be memoized in the parent to prevent unnecessary re-renders
    prevProps.account.id === nextProps.account.id &&
    prevProps.onSuccess === nextProps.onSuccess,
);

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

  // State to track the current active tab
  const [activeTabIndex, setActiveTabIndex] = useState(initialTabIndex);

  // Memoize the onSuccess callback to prevent unnecessary re-renders
  const onLinkSuccess = useCallback(() => {
    fetchOptInStatus();
  }, [fetchOptInStatus]);

  // Render individual account item for linked accounts
  const renderLinkedAccountItem: ListRenderItem<AccountWithOptInStatus> =
    useCallback(
      ({ item: account }) => <LinkedAccountItem account={account} />,
      [],
    );

  // Render individual account item for unlinked accounts
  const renderUnlinkedAccountItem: ListRenderItem<AccountWithOptInStatus> =
    useCallback(
      ({ item: account }) => (
        <UnlinkedAccountItem account={account} onSuccess={onLinkSuccess} />
      ),
      [onLinkSuccess],
    );

  // Handle tab change
  const handleTabChange = useCallback((changeTabProperties: { i: number }) => {
    setActiveTabIndex(changeTabProperties.i);
  }, []);

  // Separate content components
  const LinkedAccountsContent = useCallback(
    () => (
      <>
        {linkedAccounts.length > 0 ? (
          <FlatList
            data={linkedAccounts}
            keyExtractor={(item) => `linked-${item.id}`}
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
      </>
    ),
    [linkedAccounts, renderLinkedAccountItem, tw],
  );

  const UnlinkedAccountsContent = useCallback(
    () => (
      <>
        {unlinkedAccounts.length > 0 ? (
          <Box twClassName="flex-1 relative">
            <FlatList
              data={unlinkedAccounts}
              keyExtractor={(item) => `unlinked-${item.id}`}
              renderItem={renderUnlinkedAccountItem}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              getItemLayout={(_, index) => ({
                length: 50,
                offset: 50 * index,
                index,
              })}
              contentContainerStyle={tw.style('gap-3 pt-4')}
            />
          </Box>
        ) : (
          <Box twClassName="py-8">
            <RewardsInfoBanner
              title={strings('rewards.settings.all_accounts_linked_title')}
              description={strings(
                'rewards.settings.all_accounts_linked_description',
              )}
            />
          </Box>
        )}
      </>
    ),
    [unlinkedAccounts, renderUnlinkedAccountItem, tw],
  );

  // Tab configurations
  const tabConfigs = [
    {
      key: 'linked',
      label: strings('rewards.settings.tab_linked_accounts', {
        count: linkedAccounts.length,
      }),
      content: <LinkedAccountsContent />,
    },
    {
      key: 'unlinked',
      label: strings('rewards.settings.tab_unlinked_accounts', {
        count: unlinkedAccounts.length,
      }),
      content: <UnlinkedAccountsContent />,
    },
  ];

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

  if (
    hasErrorOptInSummary &&
    !linkedAccounts.length &&
    !unlinkedAccounts.length
  ) {
    return (
      <Box twClassName="py-8">
        <RewardsErrorBanner
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
    );
  }

  // Tab-based account list - only render active tab content
  return (
    <TabsList
      initialActiveIndex={initialTabIndex}
      onChangeTab={handleTabChange}
    >
      {tabConfigs.map((tab, index) => (
        <View
          key={tab.key}
          {...({
            tabLabel: tab.label,
          } as TabViewProps)}
          style={tw.style('flex-1')}
        >
          {index === activeTabIndex ? tab.content : null}
        </View>
      ))}
    </TabsList>
  );
};

export default RewardSettingsTabs;
