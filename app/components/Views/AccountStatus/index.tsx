import React, { useLayoutEffect } from 'react';
import { View, Image, TouchableOpacity } from 'react-native';
import Text from '../../../component-library/components/Texts/Text';
import {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text/Text.types';
import { useNavigation, useRoute } from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';
import { getOnboardingNavbarOptions  } from '../../UI/Navbar';
import { useTheme } from '../../../util/theme';
import styles from './index.styles';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import Icon , { IconName, IconSize } from '../../../component-library/components/Icons/Icon';

const account_status_img = require('../../../images/account_status.png'); // eslint-disable-line

interface AccountStatusProps {
  type?: 'found' | 'not_exist';
}

interface AccountRouteParams {
  accountName?: string;
  onContinue?: () => void;
}

const AccountStatus = ({
  type = 'not_exist',
}: AccountStatusProps) => {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();

  const accountName = (route.params as AccountRouteParams)?.accountName;
  const onContinue = (route.params as AccountRouteParams)?.onContinue;

  useLayoutEffect(() => {
    const marginLeft = 16;
    const headerLeft = () => (
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Icon
          name={IconName.ArrowLeft}
          size={IconSize.Lg}
          color={colors.text.default}
          style={{ marginLeft }}
        />
      </TouchableOpacity>
    );

    const headerRight = () => (
      <View />
    );

    navigation.setOptions(getOnboardingNavbarOptions(route, {
      headerLeft,
      headerRight,
    },
    colors,
    false,));
  }, [navigation, colors, route]);

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
        onPress={() => {
          if (onContinue) {
            onContinue();
          } else {
            // better handling if no onContinue is provided
            navigation.navigate('Onboarding');
          }
        }}
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
