import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { strings } from '../../../../locales/i18n';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../util/theme';

interface AccountDetailsBoxProps {
  type: 'backup' | 'reveal';
  title: string;
}

const AccountDetailsBox = ({
  type = 'backup',
  title,
}: AccountDetailsBoxProps) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    box: {
      backgroundColor: colors.background.muted,
      padding: 16,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      columnGap: 8,
    },
    boxRight: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 8,
    },
    accountDetailsBox: {
      flexDirection: 'column',
      rowGap: 8,
      backgroundColor: colors.background.muted,
      padding: 16,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
    },
    accountDetailsBoxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      columnGap: 8,
    },
    accountDetailsBoxRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 8,
      flex: 1,
    },
  });

  return (
    <View>
      <View style={styles.box}>
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
          {title}
        </Text>
        <View style={styles.boxRight}>
          <Text
            variant={TextVariant.BodyMDMedium}
            color={type === 'backup' ? TextColor.Error : TextColor.Alternative}
          >
            {type === 'backup'
              ? strings('protect_your_wallet.back_up')
              : strings('protect_your_wallet.reveal')}
          </Text>
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Lg}
            color={IconColor.Alternative}
          />
        </View>
      </View>
      <View style={styles.accountDetailsBox}>
        <View style={styles.accountDetailsBoxRow}>
          <View style={styles.accountDetailsBoxRowLeft}>
            <Icon
              name={IconName.Account}
              size={IconSize.Md}
              color={IconColor.Alternative}
            />
            <Text variant={TextVariant.BodySMMedium} color={TextColor.Default}>
              Account 1{' '}
              <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
                0x12C7e...q135f
              </Text>
            </Text>
          </View>
          <Text variant={TextVariant.BodySM} color={TextColor.Default}>
            $1,841.09
          </Text>
        </View>
        <View style={styles.accountDetailsBoxRow}>
          <View style={styles.accountDetailsBoxRowLeft}>
            <Icon
              name={IconName.AccountType}
              size={IconSize.Md}
              color={IconColor.Alternative}
            />
            <Text variant={TextVariant.BodySMMedium} color={TextColor.Default}>
              Solana account 1{' '}
              <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
                0xcDhSY...CFLtV
              </Text>
            </Text>
          </View>
          <Text variant={TextVariant.BodySM} color={TextColor.Default}>
            $1,841.09
          </Text>
        </View>
      </View>
    </View>
  );
};

export default AccountDetailsBox;
