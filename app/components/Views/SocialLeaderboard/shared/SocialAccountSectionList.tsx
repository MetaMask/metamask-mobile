import {
  AvatarAccount,
  AvatarAccountSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { memo, useCallback, useMemo } from 'react';
import { Pressable } from 'react-native';
import { useSelector } from 'react-redux';
import AccountListBalanceProviders from '../../../hooks/AccountListBalanceProviders';
import AccountListCell from '../../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList/AccountListCell';
import AccountListHeader from '../../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList/AccountListHeader';
import {
  getAvatarAccountVariant,
  type AccountAvatarVariant,
} from '../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import { selectAvatarAccountType } from '../../../../selectors/settings';
import type { LinkableSocialAccount } from '../hooks/useLinkableSocialAccounts';

export interface SocialAccountSectionListProps {
  accounts: LinkableSocialAccount[];
  selectedAccountId?: string | null;
  onSelect: (account: LinkableSocialAccount) => void;
  /** Prefix for each row test id, joined with the account id. */
  rowTestIdPrefix: string;
  disabled?: boolean;
}

interface SocialAccountSection {
  title: string;
  accounts: LinkableSocialAccount[];
}

/**
 * Groups rows by consecutive wallet title, preserving the hook's order.
 * Rows from the same wallet stay together because the hook walks wallets in tree order.
 */
const groupLinkableAccountsByWallet = (
  accounts: LinkableSocialAccount[],
): SocialAccountSection[] => {
  const sections: SocialAccountSection[] = [];

  accounts.forEach((account) => {
    const previous = sections[sections.length - 1];
    if (previous && previous.title === account.walletTitle) {
      previous.accounts.push(account);
      return;
    }
    sections.push({ title: account.walletTitle, accounts: [account] });
  });

  return sections;
};

interface SocialAccountRowProps {
  account: LinkableSocialAccount;
  avatarAccountType: AccountAvatarVariant;
  isSelected: boolean;
  disabled: boolean;
  onSelect: (account: LinkableSocialAccount) => void;
  testID: string;
}

const SocialAccountRow = memo(
  ({
    account,
    avatarAccountType,
    isSelected,
    disabled,
    onSelect,
    testID,
  }: SocialAccountRowProps) => {
    const handlePress = useCallback(() => {
      if (disabled) {
        return;
      }
      onSelect(account);
    }, [account, disabled, onSelect]);

    if (!account.accountGroup) {
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled, selected: isSelected }}
          disabled={disabled}
          onPress={handlePress}
          testID={testID}
        >
          <Box
            alignItems={BoxAlignItems.Center}
            flexDirection={BoxFlexDirection.Row}
            gap={3}
            twClassName={`px-4 py-3 ${isSelected ? 'bg-section' : ''}`}
          >
            <AvatarAccount
              address={account.address}
              size={AvatarAccountSize.Md}
              variant={getAvatarAccountVariant(avatarAccountType)}
            />
            <Box twClassName="min-w-0 flex-1">
              <Text numberOfLines={1} variant={TextVariant.BodyMd}>
                {account.name}
              </Text>
              {account.balanceLabel ? (
                <Text
                  color={TextColor.TextAlternative}
                  numberOfLines={1}
                  variant={TextVariant.BodySm}
                >
                  {account.balanceLabel}
                </Text>
              ) : null}
            </Box>
          </Box>
        </Pressable>
      );
    }

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled, selected: isSelected }}
        disabled={disabled}
        onPress={handlePress}
        testID={testID}
      >
        <AccountListCell
          accountGroup={{
            ...account.accountGroup,
            metadata: {
              ...account.accountGroup.metadata,
              name: account.name,
            },
          }}
          avatarAccountType={avatarAccountType}
          hideMenu
          isSelected={isSelected}
          onSelectAccount={handlePress}
        />
      </Pressable>
    );
  },
);

SocialAccountRow.displayName = 'SocialAccountRow';

const SocialAccountSections = ({
  accounts,
  selectedAccountId,
  onSelect,
  rowTestIdPrefix,
  disabled = false,
}: SocialAccountSectionListProps): React.JSX.Element => {
  const avatarAccountType = useSelector(selectAvatarAccountType);
  const sections = useMemo(
    () => groupLinkableAccountsByWallet(accounts),
    [accounts],
  );
  const showWalletHeaders = sections.length > 1;

  return (
    <>
      {sections.map((section, sectionIndex) => (
        <React.Fragment key={`${section.title}-${sectionIndex}`}>
          {showWalletHeaders && section.title ? (
            <AccountListHeader title={section.title} />
          ) : null}
          {section.accounts.map((account) => (
            <SocialAccountRow
              key={account.id}
              account={account}
              avatarAccountType={avatarAccountType}
              disabled={disabled}
              isSelected={account.id === selectedAccountId}
              onSelect={onSelect}
              testID={`${rowTestIdPrefix}-${account.id}`}
            />
          ))}
        </React.Fragment>
      ))}
    </>
  );
};

/**
 * Homepage account rows and wallet titles for a social account list.
 * Selection stays with the caller. The account-selector search, menu, and
 * add actions are not part of this list.
 */
const SocialAccountSectionList: React.FC<SocialAccountSectionListProps> = (
  props,
) => (
  <AccountListBalanceProviders>
    <SocialAccountSections {...props} />
  </AccountListBalanceProviders>
);

export default SocialAccountSectionList;
