import React, { memo, useCallback } from 'react';
import {
  Box,
  Text,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
  ButtonIcon,
  ButtonIconSize,
  TextVariant as DsTextVariant,
  IconName as IconNameDS,
  TextColor as DsTextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { isEmpty } from 'lodash';
import { strings } from '../../../../../../locales/i18n';
import AvatarAccount, {
  AvatarAccountType,
} from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { useLinkAccountGroup } from '../../hooks/useLinkAccountGroup';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { RewardSettingsAccountGroupListFlatListItem } from './types';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import { selectIconSeedAddressByAccountGroupId } from '../../../../../selectors/multichainAccounts/accounts';
import { selectBulkLinkIsRunning } from '../../../../../reducers/rewards/selectors';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../../../util/theme';

// Enhanced props interface with pre-computed data for performance
interface RewardSettingsAccountGroupProps {
  item: RewardSettingsAccountGroupListFlatListItem;
  avatarAccountType: AvatarAccountType;
  testID?: string;
}

//

// Optimized component that receives pre-computed data
const RewardSettingsAccountGroup: React.FC<RewardSettingsAccountGroupProps> = ({
  item,
  avatarAccountType,
  testID,
}) => {
  const { accountGroup } = item;
  const tw = useTailwind();
  const theme = useTheme();

  // Determine EVM address internally using the account group ID
  const evmAddress = useSelector((state: RootState) => {
    if (!accountGroup?.id) return undefined;
    try {
      const selector = selectIconSeedAddressByAccountGroupId(accountGroup.id);
      return selector(state);
    } catch {
      return undefined;
    }
  });

  const { linkAccountGroup, isLoading } = useLinkAccountGroup();
  const navigation = useNavigation();
  const isBulkLinkRunning = useSelector(selectBulkLinkIsRunning);

  // Inline handlers for each account group
  const handleLinkAccountGroup = useCallback(async () => {
    if (!accountGroup) {
      return;
    }

    await linkAccountGroup(accountGroup.id);
  }, [accountGroup, linkAccountGroup]);

  const handleShowAddresses = useCallback(() => {
    // Pre-compute address data to pass as props
    const linkedAddresses =
      accountGroup?.optedInAccounts.map((account) => ({
        address: account.address,
        hasOptedIn: true,
        scopes: account.scopes || [],
        isSupported: true,
      })) ?? [];

    const unlinkedAddresses =
      accountGroup?.optedOutAccounts.map((account) => ({
        address: account.address,
        hasOptedIn: false,
        scopes: account.scopes || [],
        isSupported: true,
      })) ?? [];

    const unsupportedAddresses =
      accountGroup?.unsupportedAccounts?.map((account) => ({
        address: account.address,
        hasOptedIn: false,
        scopes: account.scopes || [],
        isSupported: false,
      })) ?? [];

    const addressData = [
      ...linkedAddresses,
      ...unlinkedAddresses,
      ...unsupportedAddresses,
    ];

    navigation.navigate(Routes.MODAL.REWARDS_OPTIN_ACCOUNT_GROUP_MODAL, {
      accountGroupId: accountGroup?.id,
      addressData,
    });
  }, [navigation, accountGroup]);

  // Early return after hooks to maintain hook order
  if (
    !accountGroup ||
    (isEmpty(accountGroup.optedInAccounts) &&
      isEmpty(accountGroup.optedOutAccounts))
  ) {
    return null;
  }

  // Calculate tracked accounts count
  const optedInCount = accountGroup.optedInAccounts.length;
  const totalTrackableCount =
    accountGroup.optedInAccounts.length + accountGroup.optedOutAccounts.length;

  // Determine icon name for link button
  const linkButtonIconName =
    accountGroup.optedOutAccounts.length === 0
      ? IconNameDS.Check
      : IconNameDS.Add;

  return (
    <View style={tw.style('w-full flex-row items-center px-4 bg-default')}>
      <Box
        twClassName="flex-1 flex-row items-center py-4 rounded-lg gap-3"
        flexDirection={BoxFlexDirection.Row}
        testID={
          testID || `rewards-account-group-${accountGroup?.id || 'unknown'}`
        }
      >
        {/* Avatar - use EVM address or fallback to zero address */}
        <AvatarAccount
          accountAddress={
            evmAddress || '0x0000000000000000000000000000000000000000'
          }
          type={avatarAccountType}
          size={AvatarSize.Lg}
          testID={`rewards-account-group-avatar-${accountGroup.id}`}
        />

        {/* Account Name */}
        <Box
          twClassName={`flex-1 flex-col`}
          testID={`rewards-account-group-info-${accountGroup.id}`}
        >
          <Text
            variant={DsTextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            numberOfLines={1}
            testID={`rewards-account-group-name-${accountGroup.id}`}
          >
            {accountGroup.name}
          </Text>

          {/* Tracked Accounts Count */}
          <Text
            variant={DsTextVariant.BodySm}
            color={DsTextColor.TextAlternative}
            testID={`rewards-account-group-tracked-${accountGroup.id}`}
          >
            {strings('rewards.link_account_group.tracked_count', {
              optedIn: optedInCount.toString(),
              total: totalTrackableCount.toString(),
            })}
          </Text>
        </Box>

        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-4"
          testID={`rewards-account-group-actions-${accountGroup.id}`}
        >
          {/* Menu button to show account addresses */}
          <ButtonIcon
            iconName={IconNameDS.Details}
            size={ButtonIconSize.Lg}
            onPress={handleShowAddresses}
            isDisabled={isLoading}
            testID={`rewards-account-addresses-${accountGroup.id}`}
            twClassName="bg-subsection rounded-xl"
          />

          {isLoading ? (
            <Box
              twClassName="bg-subsection rounded-xl h-10 w-10 items-center justify-center"
              testID={`rewards-account-group-link-button-loading-${accountGroup.id}`}
            >
              <ActivityIndicator
                size="small"
                color={theme.colors.icon.default}
              />
            </Box>
          ) : (
            <ButtonIcon
              iconName={linkButtonIconName}
              size={ButtonIconSize.Lg}
              isDisabled={
                accountGroup.optedOutAccounts.length === 0 || isBulkLinkRunning
              }
              onPress={handleLinkAccountGroup}
              testID={`rewards-account-group-link-button-${accountGroup.id}`}
              twClassName="bg-subsection rounded-xl"
            />
          )}
        </Box>
      </Box>
    </View>
  );
};

// Memoize the component to prevent unnecessary re-renders
const MemoizedRewardSettingsAccountGroup = memo(RewardSettingsAccountGroup);

export default MemoizedRewardSettingsAccountGroup;
export type { RewardSettingsAccountGroupProps };
