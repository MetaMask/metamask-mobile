import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ThemeColors } from '@metamask/design-tokens/dist/types/js/themes/types';

import Device from '../../../../../../util/device';
import { useTheme } from '../../../../../../util/theme';
import { useAlerts } from '../../../context/Alerts';

import {
  IconName,
  IconColor,
} from '../../../../../../component-library/components/Icons/Icon';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../../component-library/components/Buttons/ButtonIcon';
import BottomModal from '../BottomModal';

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background.default,
      paddingTop: 24,
      minHeight: '90%',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
      alignItems: 'center',
    },
    wrapper: {
      borderWidth: 0.5,
      borderColor: colors.error.default,
      backgroundColor: colors.error.muted,
    },
  });

const AlertModal = () => {
  const { alerts, alertModalVisible, hideAlertModal } = useAlerts();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  if (!alertModalVisible) {
    return null;
  }

  return (
    <BottomModal onClose={hideAlertModal}>
      <View style={styles.container}>
        <ButtonIcon
          onPress={hideAlertModal}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          iconName={IconName.Close}
          iconColor={IconColor.Primary}
          size={ButtonIconSizes.Lg}
        />
        <View style={styles.wrapper}>
          <Text>{alerts[0].title}</Text>
          <Text>{alerts[0].message}</Text>
          {alerts[0].component}
        </View>
      </View>
    </BottomModal>
  );
};

export default AlertModal;
