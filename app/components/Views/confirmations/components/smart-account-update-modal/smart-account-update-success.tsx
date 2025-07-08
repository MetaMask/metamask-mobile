import React, { useCallback } from 'react';
import { Linking, View } from 'react-native';

import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './smart-account-update-modal.styles';
import { useNavigation } from '@react-navigation/native';
import AppConstants from '../../../../../core/AppConstants';
import { strings } from '../../../../../../locales/i18n';

export const SmartAccountUpdateSuccess = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();

  const onClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={styles.wrapper}>
      <ButtonIcon
        iconColor={IconColor.Default}
        iconName={IconName.Close}
        onPress={onClose}
        size={ButtonIconSizes.Md}
        style={styles.edit}
        testID="smart_account_update_success_close"
      />
      <Text variant={TextVariant.HeadingMD}>Successful!</Text>
      <Text variant={TextVariant.BodyMD}>
        Your account will be updated to smart account with your next
        transaction.
      </Text>
      <Text
        color={TextColor.Primary}
        onPress={() => Linking.openURL(AppConstants.URLS.SMART_ACCOUNTS)}
      >
        {strings('alert_system.upgrade_account.learn_more')}
      </Text>
    </View>
  );
};
