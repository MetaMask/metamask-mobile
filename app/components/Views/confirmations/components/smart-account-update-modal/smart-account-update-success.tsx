import React, { useCallback } from 'react';
import { Linking, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { strings } from '../../../../../../locales/i18n';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import AppConstants from '../../../../../core/AppConstants';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './smart-account-update-modal.styles';

export const SmartAccountUpdateSuccess = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();

  const onClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={styles.successWrapper}>
      <ButtonIcon
        iconColor={IconColor.Default}
        iconName={IconName.Close}
        onPress={onClose}
        size={ButtonIconSizes.Md}
        style={styles.actionIcon}
        testID="smart_account_update_success_close"
      />
      <View style={styles.successInner}>
        <Icon
          name={IconName.CheckBold}
          color={IconColor.Success}
          size={IconSize.Xl}
        />
        <Text variant={TextVariant.HeadingMD}>
          {strings('confirm.7702_functionality.successful')}
        </Text>
        <Text variant={TextVariant.BodyMD}>
          {strings('confirm.7702_functionality.success_message')}
        </Text>
        <Text
          color={TextColor.Primary}
          onPress={() => Linking.openURL(AppConstants.URLS.SMART_ACCOUNTS)}
        >
          {strings('alert_system.upgrade_account.learn_more')}
        </Text>
      </View>
    </View>
  );
};
