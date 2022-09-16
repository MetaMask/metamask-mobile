import React from 'react';
import { View } from 'react-native';
import { AccountBaseProps } from './AccountBase.types';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Text';
import BadgeWrapper from '../../../../component-library/components/Badges/BadgeWrapper';
import AvatarAccount from '../../../../component-library/components/Avatars/AvatarAccount';
import { ACCOUNT_BALANCE_AVATAR_TEST_ID } from './AccountBase.constants';

const AccountBase = ({
  accountBalance,
  accountNativeCurrency,
  accountNetwork,
  accountType,
  accountBalanceLabel,
  avatarProps,
  badgeProps,
}: AccountBaseProps): JSX.Element => (
  <>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <BadgeWrapper
        badgeProps={badgeProps}
        style={{ marginRight: 8, alignSelf: 'center' }}
      >
        <AvatarAccount
          testID={ACCOUNT_BALANCE_AVATAR_TEST_ID}
          accountAddress={avatarProps?.accountAddress}
        />
      </BadgeWrapper>

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
