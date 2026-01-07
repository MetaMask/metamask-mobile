import React, { useCallback, useMemo, memo } from 'react';
import { useSelector } from 'react-redux';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
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
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { useRewardOptinSummary } from '../../hooks/useRewardOptinSummary';
import { selectAvatarAccountType } from '../../../../../selectors/settings';
import { selectInternalAccountsByGroupId } from '../../../../../selectors/multichainAccounts/accounts';
import { AccountGroupId } from '@metamask/account-api';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import RewardSettingsAccountGroup from './RewardSettingsAccountGroup';
import { RewardSettingsAccountGroupListFlatListItem } from './types';
import Routes from '../../../../../constants/navigation/Routes';
import { RewardsMetricsButtons } from '../../utils';
import { useOptout } from '../../hooks/useOptout';
import { useMetrics, MetaMetricsEvents } from '../../../../hooks/useMetrics';
import RewardsErrorBanner from '../RewardsErrorBanner';

const RewardSettingsAccountGroupList: React.FC = () => {
  const tw = useTailwind();
  const { isLoading: isOptingOut, showOptoutBottomSheet } = useOptout();
  const { trackEvent, createEventBuilder } = useMetrics();

  // Move all expensive operations to parent component
  const avatarAccountType = useSelector(selectAvatarAccountType);

  const {
    byWallet,
    isLoading: isLoadingOptInSummary,
    hasError: hasErrorOptInSummary,
    refresh: fetchOptInStatus,
  } = useRewardOptinSummary();

  // Helper function to extract addresses for a single account group
  const getAddressesForGroup = useCallback(
    (state: RootState, groupId: AccountGroupId): string[] => {
      try {
        const accounts = selectInternalAccountsByGroupId(state)(groupId);
        return accounts.map((account) => account.address).filter(Boolean);
      } catch {
        return [];
      }
    },
    [],
  );

  // Memoize expensive selector operations to prevent unnecessary re-renders
  const allAddresses = useSelector((state: RootState) => {
    const addresses: Record<string, string[]> = {};
    const allGroups = byWallet.flatMap((walletItem) => walletItem.groups);

    allGroups.forEach((accountGroup) => {
      addresses[accountGroup.id] = getAddressesForGroup(state, accountGroup.id);
    });

    return addresses;
  });

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
          default:
            return null;
        }
      },
      [avatarAccountType],
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
        </Box>
      </Box>
    ),
    [],
  );

  const ListFooterComponent = useCallback(
    () => (
      <Box
        testID="rewards-settings-footer"
        twClassName="gap-4 flex-col py-4 px-4"
      >
        <Box twClassName="gap-2">
          <Text variant={TextVariant.HeadingSm}>
            {strings('rewards.optout.title')}
          </Text>
          <Text variant={TextVariant.BodySm} twClassName="text-alternative">
            {strings('rewards.optout.description')}
          </Text>
        </Box>

        <Button
          testID="rewards-opt-out-button"
          variant={ButtonVariants.Secondary}
          label={strings('rewards.optout.confirm')}
          isDisabled={isOptingOut}
          isDanger
          width={null as unknown as number}
          onPress={() => {
            showOptoutBottomSheet(Routes.REWARDS_SETTINGS_VIEW);
            trackEvent(
              createEventBuilder(MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED)
                .addProperties({
                  button_type: RewardsMetricsButtons.OPT_OUT,
                })
                .build(),
            );
          }}
        />
      </Box>
    ),
    [isOptingOut, showOptoutBottomSheet, trackEvent, createEventBuilder],
  );

  // Flatten data for FlatList
  const flattenedData =
    useMemo((): RewardSettingsAccountGroupListFlatListItem[] => {
      const items: RewardSettingsAccountGroupListFlatListItem[] = [];

      byWallet.forEach((walletItem) => {
        // Add wallet header
        items.push({
          type: 'wallet',
          walletItem,
        });

        // Add account groups
        walletItem.groups.forEach((accountGroup) => {
          items.push({
            type: 'accountGroup',
            accountGroup,
            allAddresses: allAddresses?.[accountGroup.id] || [],
          });
        });
      });

      return items;
    }, [byWallet, allAddresses]);

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

  // Account list using FlatList for better performance
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
    />
  );
};

// Memoize the component to prevent unnecessary re-renders
const MemoizedRewardSettingsAccountGroupList = memo(
  RewardSettingsAccountGroupList,
);

export default MemoizedRewardSettingsAccountGroupList;
