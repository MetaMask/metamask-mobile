import React from 'react';
import { View } from 'react-native';
import { AccountBaseProps } from './AccountBase.types';
import Avatar from '../../../../component-library/components/Avatars/Avatar';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Text';
import { ACCOUNT_BALANCE_AVATAR_TEST_ID } from './AccountBase.constants';
import { AvatarBaseSize } from '../../../../component-library/components/Avatars/AvatarBase';

const AccountBase = ({
  accountBalance,
  accountNativeCurrency,
  accountNetwork,
  accountType,
  accountBalanceLabel,
  avatarProps,
}: AccountBaseProps) => (
  <>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Avatar
        style={{ marginRight: 8 }}
        testID={ACCOUNT_BALANCE_AVATAR_TEST_ID}
        {...avatarProps}
        size={AvatarBaseSize.Md}
      />
      <View>
        <Text variant={TextVariant.sBodySM}>{accountNetwork}</Text>
        <Text variant={TextVariant.lBodySMBold}>{accountType}</Text>
      </View>
    </View>
    <View>
      <Text variant={TextVariant.sBodySM} style={{ marginLeft: 'auto' }}>
        {accountBalanceLabel}
      </Text>
      <Text variant={TextVariant.lBodySMBold}>
        {accountBalance} {accountNativeCurrency}
      </Text>
    </View>
  </>
);

export default AccountBase;
