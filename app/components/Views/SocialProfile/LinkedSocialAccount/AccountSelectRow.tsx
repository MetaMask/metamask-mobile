import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
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

import type { RootState } from '../../../../reducers';
import { selectBalanceByAccountGroup } from '../../../../selectors/assets/balances';
import { selectAllAccountGroupIconSeedAddresses } from '../../../../selectors/multichainAccounts/accounts';
import { selectPrivacyMode } from '../../../../selectors/preferencesController';
import { formatWithThreshold } from '../../../../util/assets';
import I18n from '../../../../../locales/i18n';
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
  // Read this row's icon seed from the shared map selector rather than building
  // a per-row deep-equal selector, matching AccountCell.
  const iconSeedAddress = useSelector(
    (state: RootState) =>
      selectAllAccountGroupIconSeedAddresses(state)[accountGroup.id] ?? '',
  );

  const selectBalanceForGroup = useMemo(
    () => selectBalanceByAccountGroup(accountGroup.id),
    [accountGroup.id],
  );
  const groupBalance = useSelector(selectBalanceForGroup);
  const totalBalance = groupBalance?.totalBalanceInUserCurrency;
  const userCurrency = groupBalance?.userCurrency;
  const privacyMode = useSelector(selectPrivacyMode);

  const displayBalance = useMemo(() => {
    if (totalBalance == null || !userCurrency) {
      return undefined;
    }
    return formatWithThreshold(totalBalance, 0.01, I18n.locale, {
      style: 'currency',
      currency: userCurrency.toUpperCase(),
    });
  }, [totalBalance, userCurrency]);

  const handlePress = useCallback(
    () => onSelect(accountGroup.id),
    [accountGroup.id, onSelect],
  );

  // Zero balances stay blank: `selectBalanceByAccountGroup` synthesizes 0
  // before assets load, so "$0.00" would read as a real empty wallet. Same
  // treatment as AccountCell.
  const balanceLabel = totalBalance ? displayBalance : undefined;

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
        isHidden: privacyMode && Boolean(balanceLabel),
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
