import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../../util/theme';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { strings } from '../../../../locales/i18n';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import { useNavigation } from '@react-navigation/native';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import AccountDetailsBox from './AccountDetailsBox';

const ProtectYourWallet = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const styles = StyleSheet.create({
    root: {
      flex: 1,
      padding: 16,
      flexDirection: 'column',
      rowGap: 16,
    },
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
  });

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('protect_your_wallet.title'),
        navigation,
        false,
        colors,
      ),
    );
  }, [navigation, colors]);

  return (
    <View style={styles.root}>
      <View style={styles.box}>
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
          {strings('protect_your_wallet.login_with_social')}
        </Text>
        <View style={styles.boxRight}>
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Error}>
            {strings('protect_your_wallet.setup')}
          </Text>
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Lg}
            color={IconColor.Alternative}
          />
        </View>
      </View>

      <AccountDetailsBox
        type="backup"
        title={strings('protect_your_wallet.secret_recovery_phrase', {
          num: 1,
        })}
      />

      <AccountDetailsBox
        type="reveal"
        title={strings('protect_your_wallet.secret_recovery_phrase', {
          num: 2,
        })}
      />
    </View>
  );
};

export default ProtectYourWallet;
