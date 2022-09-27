import React from 'react';
import { View } from 'react-native';
import { AccountBaseProps } from './AccountBase.types';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Text';
import BadgeWrapper from '../../../../component-library/components/Badges/BadgeWrapper';
import AvatarAccount from '../../../../component-library/components/Avatars/AvatarAccount';
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
        <AvatarAccount
          testID={ACCOUNT_BALANCE_AVATAR_TEST_ID}
          accountAddress={accountAddress}
        />
      </BadgeWrapper>
      <View>
        <Text variant={TextVariant.sBodySM}>{accountNetwork}</Text>
        <Text variant={TextVariant.lBodySMBold}>{accountName}</Text>
      </View>
    </View>
    <View>
      <Text variant={TextVariant.sBodySM} style={styles.label}>
        {accountBalanceLabel}
      </Text>
      <Text variant={TextVariant.lBodySMBold}>
        {accountBalance} {accountNativeCurrency}
      </Text>
    </View>
  </View>
);
export default AccountBase;
