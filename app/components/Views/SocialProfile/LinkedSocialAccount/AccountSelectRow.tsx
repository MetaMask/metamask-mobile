import React, { useCallback } from 'react';
import type { AccountGroupObject } from '@metamask/account-tree-controller';
import {
  AvatarAccount,
  AvatarAccountSize,
  type AvatarAccountVariant,
  AvatarBaseShape,
  ContentVariant,
  ListItem,
  RadioButton,
  SensitiveTextLength,
} from '@metamask/design-system-react-native';

import {
  useAccountGroupBalance,
  useAccountGroupIconSeedAddress,
} from '../../../../component-library/components-temp/MultichainAccounts/useAccountGroupDisplay';
import { LinkedSocialAccountSelectorsIDs } from './LinkedSocialAccount.testIds';

interface AccountSelectRowProps {
  accountGroup: AccountGroupObject;
  /** Resolved from the user's avatar preference by the parent. */
  avatarVariant: AvatarAccountVariant;
  isSelected: boolean;
  /** Renders a hairline separator above the row. Omit for the first row. */
  showDivider?: boolean;
  onSelect: (accountGroupId: string) => void;
}

/**
 * One selectable account group: avatar, name over fiat balance, and a radio
 * marking the linked account. The selected row is tinted.
 */
const AccountSelectRow = ({
  accountGroup,
  avatarVariant,
  isSelected,
  showDivider = false,
  onSelect,
}: AccountSelectRowProps) => {
  const iconSeedAddress = useAccountGroupIconSeedAddress(accountGroup.id);
  const { balanceLabel, isBalanceHidden } = useAccountGroupBalance(
    accountGroup.id,
  );

  const handlePress = useCallback(
    () => onSelect(accountGroup.id),
    [accountGroup.id, onSelect],
  );

  return (
    <ListItem
      isInteractive
      variant={ContentVariant.TwoLines}
      avatar={
        <AvatarAccount
          address={iconSeedAddress}
          variant={avatarVariant}
          shape={AvatarBaseShape.Square}
          size={AvatarAccountSize.Md}
        />
      }
      title={accountGroup.metadata.name}
      titleProps={{ numberOfLines: 1 }}
      description={balanceLabel}
      descriptionProps={{
        length: SensitiveTextLength.Long,
        isHidden: isBalanceHidden,
      }}
      endAccessory={
        // The whole row is the control, so the radio itself is not separately
        // focusable.
        <RadioButton isChecked={isSelected} isReadOnly />
      }
      accessoryGap={2}
      twClassName={[
        showDivider ? 'border-t border-muted' : '',
        isSelected ? 'bg-primary-muted' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onPress={handlePress}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={accountGroup.metadata.name}
      testID={LinkedSocialAccountSelectorsIDs.accountRow(accountGroup.id)}
    />
  );
};

export default AccountSelectRow;
