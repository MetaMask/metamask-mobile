import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
  IconColor,
  AvatarAccount,
  AvatarBaseSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import MoneyBalanceIcon from '../../../../../../images/money-balance.svg';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { SpendingLimitSelectors } from '../SpendingLimit.testIds';
import { AvatarAccountType } from '../../../../../../component-library/components/Avatars/Avatar';
import { getAvatarAccountVariant } from '../../../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';

export interface AccountRowProps {
  isMoneyAccountLocked: boolean;
  isMoneyAccountSource: boolean;
  selectedAccount: InternalAccount | null;
  avatarAccountType: AvatarAccountType;
  accountGroupName?: string | null;
  onPress: () => void;
}

const RowLabel = () => (
  <Text variant={TextVariant.BodyMd} twClassName="flex-1 text-text-alternative">
    {strings('card.card_spending_limit.account_label')}
  </Text>
);

const Chevron = () => {
  const tw = useTailwind();
  return (
    <Icon
      name={IconName.ArrowDown}
      size={IconSize.Md}
      color={IconColor.IconDefault}
      style={tw.style('self-center shrink-0')}
    />
  );
};

const MoneyAccountChip = ({ showChevron }: { showChevron: boolean }) => {
  const tw = useTailwind();
  return (
    <Box
      twClassName="flex-row items-center gap-2 shrink min-w-0"
      testID={SpendingLimitSelectors.ACCOUNT_ROW_MONEY_ACCOUNT}
    >
      <MoneyBalanceIcon width={24} height={24} name="money-balance" />
      <Text
        variant={TextVariant.BodyMd}
        twClassName="text-text-default font-medium self-center shrink"
        numberOfLines={1}
      >
        {strings('card.card_spending_limit.money_account_label')}
      </Text>
      {showChevron && <Chevron />}
    </Box>
  );
};

const RegularAccountChip = ({
  selectedAccount,
  avatarAccountType,
  accountGroupName,
}: Pick<
  AccountRowProps,
  'selectedAccount' | 'avatarAccountType' | 'accountGroupName'
>) => {
  if (!selectedAccount) return null;
  return (
    <Box twClassName="flex-row items-center gap-2 shrink min-w-0">
      <AvatarAccount
        address={selectedAccount.address}
        variant={getAvatarAccountVariant(avatarAccountType)}
        size={AvatarBaseSize.Sm}
      />
      <Text
        variant={TextVariant.BodyMd}
        twClassName="text-text-default font-medium self-center shrink"
        numberOfLines={1}
      >
        {accountGroupName ?? selectedAccount.metadata.name}
      </Text>
      <Chevron />
    </Box>
  );
};

const AccountRow: React.FC<AccountRowProps> = ({
  isMoneyAccountLocked,
  isMoneyAccountSource,
  selectedAccount,
  avatarAccountType,
  accountGroupName,
  onPress,
}) => {
  if (isMoneyAccountLocked) {
    return (
      <Box
        twClassName="flex-row items-center p-4"
        testID={SpendingLimitSelectors.ACCOUNT_ROW_LOCKED}
      >
        <RowLabel />
        <MoneyAccountChip showChevron={false} />
      </Box>
    );
  }
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      testID={SpendingLimitSelectors.ACCOUNT_ROW}
    >
      <Box twClassName="flex-row items-center p-4">
        <RowLabel />
        {isMoneyAccountSource ? (
          <MoneyAccountChip showChevron />
        ) : (
          <RegularAccountChip
            selectedAccount={selectedAccount}
            avatarAccountType={avatarAccountType}
            accountGroupName={accountGroupName}
          />
        )}
      </Box>
    </TouchableOpacity>
  );
};

export default AccountRow;
