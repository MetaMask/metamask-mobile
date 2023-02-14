import React from 'react';
import { View } from 'react-native';
import { AccountBaseProps } from './AccountBase.types';
import Text, { TextVariant } from '../../../components/Texts/Text';
import BadgeWrapper from '../../../components/Badges/BadgeWrapper';
import Avatar, { AvatarVariants } from '../../../components/Avatars/Avatar';
import {
  ACCOUNT_BALANCE_AVATAR_TEST_ID,
  ACCOUNT_BASE_TEST_ID,
} from './AccountBase.constants';
import styles from './AccountBase.styles';

const AccountBase = ({
  accountBalance,
  accountNativeCurrency,
  accountNetwork,
  accountName,
  accountBalanceLabel,
  accountAddress,
  badgeProps,
}: AccountBaseProps) => (
  <View style={styles.body} testID={ACCOUNT_BASE_TEST_ID}>
    <View style={styles.container}>
      <BadgeWrapper badgeProps={badgeProps} style={styles.badgeWrapper}>
        <Avatar
          variant={AvatarVariants.Account}
          testID={ACCOUNT_BALANCE_AVATAR_TEST_ID}
          accountAddress={accountAddress}
        />
      </BadgeWrapper>
      <View>
        <Text variant={TextVariant.BodySM}>{accountNetwork}</Text>
        <Text variant={TextVariant.BodyMDBold}>{accountName}</Text>
      </View>
    </View>
    <View>
      <Text variant={TextVariant.BodySM} style={styles.label}>
        {accountBalanceLabel}
      </Text>
      <Text variant={TextVariant.BodyMDBold}>
        {accountBalance} {accountNativeCurrency}
      </Text>
    </View>
  </View>
);
export default AccountBase;
