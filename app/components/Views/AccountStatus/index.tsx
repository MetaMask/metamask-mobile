import React, { useLayoutEffect } from 'react';
import { View, Image } from 'react-native';
import Text from '../../../component-library/components/Texts/Text';
import {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text/Text.types';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';
import { getTransparentOnboardingNavbarOptions } from '../../UI/Navbar';
import { useTheme } from '../../../util/theme';
import styles from './index.styles';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';

const account_status_img = require('../../../images/account_status.png'); // eslint-disable-line

interface AccountStatusProps {
  type?: 'found' | 'not_exist';
  accountName?: string;
}

const AccountStatus = ({
  type = 'not_exist',
  accountName = 'username@gmail.com',
}: AccountStatusProps) => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  useLayoutEffect(() => {
    navigation.setOptions(getTransparentOnboardingNavbarOptions(colors));
  }, [navigation, colors]);

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Text variant={TextVariant.DisplayMD}>
          {type === 'found'
            ? strings('account_status.account_already_exists')
            : strings('account_status.account_not_found')}
        </Text>
        <Image
          source={account_status_img}
          resizeMethod={'auto'}
          style={styles.walletReadyImage}
        />
        <View style={styles.descriptionWrapper}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {type === 'found'
              ? strings('account_status.account_already_exists_description', {
                  accountName,
                })
              : strings('account_status.account_not_found_description', {
                  accountName,
                })}
          </Text>
        </View>
      </View>

      <Button
        variant={ButtonVariants.Primary}
        size={ButtonSize.Lg}
        width={ButtonWidthTypes.Full}
        onPress={() => navigation.navigate('Onboarding')}
        label={
          type === 'found'
            ? strings('account_status.log_in')
            : strings('account_status.create_new_wallet')
        }
      />
    </View>
  );
};

export default AccountStatus;
