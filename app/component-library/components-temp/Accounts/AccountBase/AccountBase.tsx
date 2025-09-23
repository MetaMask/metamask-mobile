import React from 'react';
import { View } from 'react-native';

import Badge from '../../../../component-library/components/Badges/Badge';
import Avatar, { AvatarVariant } from '../../../components/Avatars/Avatar';
import BadgeWrapper from '../../../components/Badges/BadgeWrapper';
import Text, { TextVariant } from '../../../components/Texts/Text';
import {
  ACCOUNT_BALANCE_AVATAR_TEST_ID,
  ACCOUNT_BASE_TEST_ID,
} from './AccountBase.constants';
import styles from './AccountBase.styles';
import { AccountBaseProps } from './AccountBase.types';

const AccountBase = ({
  accountBalance,
  accountTokenBalance,
  accountNativeCurrency,
  accountNetwork,
  accountName,
  accountTypeLabel,
  accountBalanceLabel,
  accountAddress,
  badgeProps,
  avatarAccountType,
}: AccountBaseProps) => (
  <View style={styles.body} testID={ACCOUNT_BASE_TEST_ID}>
    <View style={styles.container}>
      <BadgeWrapper
        badgeElement={<Badge {...badgeProps} />}
        style={styles.badgeWrapper}
        testID={ACCOUNT_BALANCE_AVATAR_TEST_ID}
      >
        <Avatar
          variant={AvatarVariant.Account}
          type={avatarAccountType}
          testID={ACCOUNT_BALANCE_AVATAR_TEST_ID}
          accountAddress={accountAddress}
        />
      </BadgeWrapper>
      <View>
        <Text variant={TextVariant.BodySM}>{accountNetwork}</Text>

        <View style={styles.accountNameLabel}>
          <Text variant={TextVariant.BodyMDBold}>{accountName}</Text>
        </View>
        {accountTypeLabel && (
          <View style={styles.accountNameLabel}>
            <Text
              variant={TextVariant.BodyMDBold}
              style={styles.accountNameLabelText}
            >
              {accountTypeLabel}
            </Text>
          </View>
        )}
      </View>
    </View>
    <View>
      <Text variant={TextVariant.BodySM} style={styles.label}>
        {accountBalanceLabel}
      </Text>
      <Text variant={TextVariant.BodyMDBold}>
        {accountTokenBalance || `${accountBalance} ${accountNativeCurrency}`}
      </Text>
    </View>
  </View>
);
export default AccountBase;
