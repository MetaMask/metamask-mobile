import React from 'react';
import { View } from 'react-native';
import RNToastMessage from 'react-native-toast-message';
import Icons from 'react-native-vector-icons/MaterialCommunityIcons';
import { strings } from '../../../../locales/i18n';
import { useAppThemeFromContext } from '../../../util/theme';
import { useStyles } from '../../hooks';
import BaseText, { BaseTextVariant } from '../BaseText';
import Link from '../Link';
import styleSheet from './Toast.styles';
import { WarningToastProps, IToast } from './Toast.types';

const BaseToast = ({
  styles,
  children,
}: {
  styles: any;
  children: React.ReactElement;
}) => (
  <View style={styles.baseToastContainer}>
    <View style={styles.baseToastWrapper}>{children}</View>
  </View>
);

const toastConfig = (styles: any, colors: any) => ({
  warningToast: function warningToast({
    text1,
    text2,
    props,
  }: {
    text1?: string | undefined;
    text2?: string | undefined;
    props: WarningToastProps;
  }) {
    return (
      <BaseToast styles={styles}>
        <>
          <View style={styles.warningToastIconContainer}>
            <Icons name="bell-outline" size={21} color={colors.text.default} />
          </View>
          <View style={styles.warningToastTextContainer}>
            <View>
              <BaseText
                style={styles.warningToastTitle}
                variant={BaseTextVariant.lHeadingSM}
              >
                {text1}
              </BaseText>
              <BaseText variant={BaseTextVariant.lBodyXS}>{text2}</BaseText>
            </View>
            <View style={styles.warningToastActionsContainer}>
              <Link
                style={styles.warningToastdismissableAction}
                variant={BaseTextVariant.sBodySM}
                onPress={() => RNToastMessage.hide()}
              >
                {strings('toast.show_warning_toast.remind_me_later')}
              </Link>
              <Link
                variant={BaseTextVariant.sBodySMBold}
                onPress={props.action}
              >
                {props.actionText}
              </Link>
            </View>
          </View>
        </>
      </BaseToast>
    );
  },
});

const Toast: IToast = () => {
  const theme = useAppThemeFromContext();
  const { styles } = useStyles(styleSheet, {});
  return (
    <RNToastMessage
      position="bottom"
      config={toastConfig(styles, theme.colors)}
    />
  );
};

Toast.showWarningToast = ({ title, message, action, actionText }) => {
  RNToastMessage.show({
    type: 'warningToast',
    text1: title,
    text2: message,
    autoHide: false,
    props: {
      action,
      actionText,
    },
  });
};

export default Toast;
