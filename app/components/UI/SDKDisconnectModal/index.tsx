import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import { toggleChannelDisconnectModal } from '../../../../app/actions/modals';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import SDKConnect from '../../../core/SDKConnect/SDKConnect';
import { useTheme } from '../../../util/theme';
import StyledButton from '../StyledButton';
import Device from '../../../../app/util/device';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface SDKDisconnectModalProps {
  onCancel: () => void;
  onConfirm: () => void;
}

const createStyles = (colors: ThemeColors, _safeAreaInsets: EdgeInsets) =>
  StyleSheet.create({
    root: {
      backgroundColor: colors.background.default,
      paddingTop: 7,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      minHeight: 150,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
    },
    titleWrapper: {
      width: '100%',
      height: 30,
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border.muted,
    },
    dragger: {
      width: 48,
      height: 5,
      borderRadius: 4,
      backgroundColor: colors.border.default,
      opacity: Device.isAndroid() ? 0.6 : 0.5,
    },
    disconnectAllFont: { color: colors.error.default },
    actionContainer: {
      flex: 0,
      flexDirection: 'row',
      paddingVertical: 16,
      paddingHorizontal: 24,
    },
    button: {
      flex: 1,
    },
    cancel: {
      marginRight: 8,
    },
    cancelContainer: {
      marginRight: 8,
    },
    confirmContainer: {
      backgroundColor: colors.error.default,
      borderColor: colors.error.default,
    },
    confirm: {
      marginLeft: 8,
      color: colors.error.inverse,
    },
  });

export const SDKDisconnectModal = (_props?: SDKDisconnectModalProps) => {
  const safeAreaInsets = useSafeAreaInsets();
  const { colors } = useTheme();
  const sdk = SDKConnect.getInstance();
  const styles = createStyles(colors, safeAreaInsets);
  const dispatch = useDispatch();

  /**
   * Calls onConfirm callback and analytics to track connect confirmed event
   */
  const onConfirm = () => {
    sdk.removeAll();
    dispatch(toggleChannelDisconnectModal());
  };

  /**
   * Calls onConfirm callback and analytics to track connect canceled event
   */
  const onCancel = () => {
    dispatch(toggleChannelDisconnectModal());
  };

  return (
    <View style={styles.root}>
      <View style={styles.titleWrapper}>
        <View style={styles.dragger} testID={'account-list-dragger'} />
      </View>
      <View style={styles.actionContainer}>
        <StyledButton
          type="normal"
          containerStyle={[styles.button, styles.cancel]}
          style={[styles.button, styles.cancelContainer]}
          onPress={onCancel}
        >
          {strings('sdk.cancel')}
        </StyledButton>
        <StyledButton
          type="normal"
          onPress={onConfirm}
          containerStyle={[styles.button, styles.confirmContainer]}
          style={[styles.disconnectAllFont, styles.confirm]}
        >
          {strings('sdk.disconnect_all')}
        </StyledButton>
      </View>
    </View>
  );
};

export default SDKDisconnectModal;
