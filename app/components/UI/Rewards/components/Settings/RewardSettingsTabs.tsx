import React, { useCallback, memo, useState } from 'react';
import { View } from 'react-native';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
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
import { useOptout } from '../../hooks/useOptout';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { RewardsMetricsButtons } from '../../utils';
import Routes from '../../../../../constants/navigation/Routes';
import ButtonComponent, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';

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
      twClassName="flex-row items-center justify-between rounded-lg py-1"
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
        twClassName="flex-row items-center justify-between rounded-lg py-1"
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

// Memoized component for opt-out footer
const OptOutFooter = memo(() => {
  const { isLoading: isOptingOut, showOptoutBottomSheet } = useOptout();
  const { trackEvent, createEventBuilder } = useMetrics();

  const handleOptOutPress = useCallback(() => {
    showOptoutBottomSheet(Routes.REWARDS_SETTINGS_VIEW);
    trackEvent(
      createEventBuilder(MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED)
        .addProperties({
          button_type: RewardsMetricsButtons.OPT_OUT,
        })
        .build(),
    );
  }, [showOptoutBottomSheet, trackEvent, createEventBuilder]);

  return (
    <Box twClassName="gap-4 flex-col">
      <Box twClassName="gap-2">
        <Text variant={TextVariant.HeadingSm}>
          {strings('rewards.optout.title')}
        </Text>
        <Text variant={TextVariant.BodySm} twClassName="text-alternative">
          {strings('rewards.optout.description')}
        </Text>
      </Box>

      <ButtonComponent
        variant={ButtonVariants.Secondary}
        label={strings('rewards.optout.confirm')}
        isDisabled={isOptingOut}
        isDanger
        width={null as unknown as number}
        onPress={handleOptOutPress}
      />
    </Box>
  );
});

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
          <FlashList
            data={linkedAccounts}
            keyExtractor={(item) => `linked-${item.id}`}
            renderItem={renderLinkedAccountItem}
            scrollEnabled
            showsVerticalScrollIndicator={false}
            ListFooterComponent={<OptOutFooter />}
          />
        ) : (
          <Box twClassName="py-8 items-center">
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-alternative text-center"
            >
              {strings('rewards.settings.no_linked_accounts')}
            </Text>
            <OptOutFooter />
          </Box>
        )}
      </>
    ),
    [linkedAccounts, renderLinkedAccountItem],
  );

  const UnlinkedAccountsContent = useCallback(
    () => (
      <>
        {unlinkedAccounts.length > 0 ? (
          <Box twClassName="flex-1 relative">
            <FlashList
              data={unlinkedAccounts}
              keyExtractor={(item) => `unlinked-${item.id}`}
              renderItem={renderUnlinkedAccountItem}
              scrollEnabled
              showsVerticalScrollIndicator={false}
              ListFooterComponent={<OptOutFooter />}
            />
          </Box>
        ) : (
          <Box twClassName="py-4 gap-4">
            <RewardsInfoBanner
              title={strings('rewards.settings.all_accounts_linked_title')}
              description={strings(
                'rewards.settings.all_accounts_linked_description',
              )}
            />
            <OptOutFooter />
          </Box>
        )}
      </>
    ),
    [unlinkedAccounts, renderUnlinkedAccountItem],
  );

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
      <Box twClassName="py-8 gap-4">
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

        <OptOutFooter />
      </Box>
    );
  }

  // Tab-based account list - render content components directly
  return (
    <TabsList
      initialActiveIndex={initialTabIndex}
      onChangeTab={handleTabChange}
    >
      <View
        key="linked"
        {...({
          tabLabel: strings('rewards.settings.tab_linked_accounts', {
            count: linkedAccounts.length,
          }),
        } as TabViewProps)}
        style={tw.style('flex-1')}
      >
        {activeTabIndex === 0 ? <LinkedAccountsContent /> : null}
      </View>

      <View
        key="unlinked"
        {...({
          tabLabel: strings('rewards.settings.tab_unlinked_accounts', {
            count: unlinkedAccounts.length,
          }),
        } as TabViewProps)}
        style={tw.style('flex-1')}
      >
        {activeTabIndex === 1 ? <UnlinkedAccountsContent /> : null}
      </View>
    </TabsList>
  );
};

export default RewardSettingsTabs;
