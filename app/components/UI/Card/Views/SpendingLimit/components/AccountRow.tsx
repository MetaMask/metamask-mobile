import React from 'react';
import { Image, TouchableOpacity } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import AvatarAccount, {
  AvatarAccountType,
} from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import musdAssetIcon from '../../../../../../images/musd-icon-2x.png';
import { InternalAccount } from '@metamask/keyring-internal-api';

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
      testID="account-row-money-account"
    >
      <Image
        source={musdAssetIcon}
        style={tw.style('w-6 h-6 rounded-full')}
        resizeMode="contain"
      />
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
        type={avatarAccountType}
        accountAddress={selectedAccount.address}
        size={AvatarSize.Xs}
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
      <Box twClassName="flex-row items-center p-4" testID="account-row-locked">
        <RowLabel />
        <MoneyAccountChip showChevron={false} />
      </Box>
    );
  }
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      testID="account-row"
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
