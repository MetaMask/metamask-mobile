import React, { memo, useCallback, useMemo } from 'react';
import {
  Box,
  Text,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
  Button,
  ButtonVariant,
  TextVariant as DsTextVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import I18n, { strings } from '../../../../../../locales/i18n';
import { isEmpty } from 'lodash';
import AvatarAccount, {
  AvatarAccountType,
} from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import Icon, {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import { useLinkAccountGroup } from '../../hooks/useLinkAccountGroup';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { RewardSettingsAccountGroupListFlatListItem } from './types';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import { selectIconSeedAddressByAccountGroupId } from '../../../../../selectors/multichainAccounts/accounts';
import { selectBalanceByAccountGroup } from '../../../../../selectors/assets/balances';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
import {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { formatWithThreshold } from '../../../../../util/assets';

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

  // Determine EVM address internally using the account group ID
  const evmAddress = useSelector((state: RootState) => {
    if (!accountGroup?.id) return undefined;
    try {
      const selector = selectIconSeedAddressByAccountGroupId(accountGroup.id);
      return selector(state);
    } catch (error) {
      return undefined;
    }
  });

  const { linkAccountGroup, isLoading } = useLinkAccountGroup();
  const navigation = useNavigation();
  const privacyMode = useSelector(selectPrivacyMode);

  // Get account group balance
  const groupBalance = useSelector((state: RootState) => {
    if (!accountGroup?.id) return null;
    const selector = selectBalanceByAccountGroup(accountGroup.id);
    return selector(state);
  });

  const displayBalance = useMemo(() => {
    if (!groupBalance?.userCurrency) {
      return undefined;
    }
    return formatWithThreshold(
      groupBalance.totalBalanceInUserCurrency,
      0.01,
      I18n.locale,
      {
        style: 'currency',
        currency: groupBalance.userCurrency.toUpperCase(),
      },
    );
  }, [groupBalance]);

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
      })) ?? [];

    const unlinkedAddresses =
      accountGroup?.optedOutAccounts.map((account) => ({
        address: account.address,
        hasOptedIn: false,
        scopes: account.scopes || [],
      })) ?? [];

    const addressData = [...linkedAddresses, ...unlinkedAddresses];

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

  return (
    <Box
      twClassName="flex-row items-center py-3 rounded-lg gap-3"
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

        {/* Account Balance */}
        {displayBalance && (
          <SensitiveText
            isHidden={privacyMode}
            length={SensitiveTextLength.Long}
            variant={TextVariant.BodySMMedium}
            color={TextColor.Alternative}
            testID={`rewards-account-group-balance-${accountGroup.id}`}
          >
            {displayBalance}
          </SensitiveText>
        )}
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-2"
        testID={`rewards-account-group-actions-${accountGroup.id}`}
      >
        {/* QR Code button to show account addresses */}
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          onPress={handleShowAddresses}
          isDisabled={isLoading}
          twClassName="px-1"
          testID={`rewards-account-addresses-${accountGroup.id}`}
        >
          <Icon name={IconName.QrCode} color={IconColor.Default} />
        </Button>

        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isDisabled={accountGroup.optedOutAccounts.length === 0}
          isLoading={isLoading}
          onPress={handleLinkAccountGroup}
          testID={`rewards-account-group-link-button-${accountGroup.id}`}
        >
          {accountGroup.optedOutAccounts.length === 0 ? (
            <Icon name={IconName.Check} color={IconColor.Success} />
          ) : (
            strings('rewards.link_account_group.link_account')
          )}
        </Button>
      </Box>
    </Box>
  );
};

// Memoize the component to prevent unnecessary re-renders
const MemoizedRewardSettingsAccountGroup = memo(RewardSettingsAccountGroup);

export default MemoizedRewardSettingsAccountGroup;
export type { RewardSettingsAccountGroupProps };
