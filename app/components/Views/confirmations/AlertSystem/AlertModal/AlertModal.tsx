import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ThemeColors } from '@metamask/design-tokens/dist/types/js/themes/types';

import Device from '../../../../../util/device';
import { useTheme } from '../../../../../util/theme';

import {
  IconName,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import BottomModal from '../../components/UI/BottomModal';
import { useAlerts } from '../context';
import Checkbox from '../../../../../component-library/components/Checkbox';
import Button, { ButtonSize, ButtonVariants, ButtonWidthTypes } from '../../../../../component-library/components/Buttons/Button';

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
    footerButton: {
      flex: 1,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border.muted,
    },
    buttonsContainer: {
      flexDirection: 'row',
      paddingVertical: 16,
    },
    buttonDivider: {
      width: 8,
    },
  });

const AlertModal = () => {
  const { alerts, alertModalVisible, hideAlertModal, setAlertConfirmed, isAlertConfirmed } = useAlerts();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  if (!alertModalVisible || alerts.length === 0) {
    return null;
  }

  const currentAlert = alerts[0];

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
          <Text>{currentAlert.title}</Text>
          <Text>{currentAlert.message}</Text>
          {currentAlert.content}
        </View>
        <View style={styles.wrapper}>
          <Checkbox
            isChecked={isAlertConfirmed(currentAlert.key)}
            onPressIn={() => setAlertConfirmed(currentAlert.key, !isAlertConfirmed(currentAlert.key))}
            label={'I have acknowledged the risk and still want to proceed'}
          />
        </View>
        <View style={styles.buttonsContainer}>
          <Button
            onPress={hideAlertModal}
            label={'Got it'}
            style={styles.footerButton}
            size={ButtonSize.Lg}
            variant={ButtonVariants.Primary}
            width={ButtonWidthTypes.Full}
          />
        </View>
      </View>
    </BottomModal>
  );
};

export default AlertModal;