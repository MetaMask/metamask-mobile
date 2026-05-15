import React from 'react';
import { TouchableOpacity, View } from 'react-native';
// TODO(ds-icon-migration): swap react-native-vector-icons for DS Icon as part
// of the icon migration. Glyph proportions differ at 36pt; deferring to keep
// the toast layout pixel-faithful until designs are reviewed.
/* eslint-disable @typescript-eslint/no-deprecated */
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import AntIcon from 'react-native-vector-icons/AntDesign';
/* eslint-enable @typescript-eslint/no-deprecated */
import {
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';

import { baseStyles } from '../../../../styles/common';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import { Theme } from '../../../../util/theme/models';
import { ToastSelectorsIDs } from '../../../../component-library/components/Toast/ToastModal.testIds';

import AnimatedSpinner from '../../AnimatedSpinner';
import styleSheet from './BaseNotification.styles';
import {
  BaseNotificationData,
  BaseNotificationProps,
  BaseNotificationStatus,
} from './BaseNotification.types';

type Styles = ReturnType<typeof styleSheet>;

export const getIcon = (
  status: BaseNotificationStatus | undefined,
  colors: Theme['colors'],
  styles: Styles,
) => {
  switch (status) {
    case 'pending':
    case 'pending_withdrawal':
    case 'pending_deposit':
    case 'speedup':
      return <AnimatedSpinner />;
    case 'success_deposit':
    case 'success_withdrawal':
    case 'success':
    case 'received':
    case 'received_payment':
    case 'eth_received':
      return (
        <IonicIcon
          color={colors.success.default}
          size={36}
          name="checkmark"
          style={styles.checkIcon}
        />
      );
    case 'cancelled':
    case 'error':
      return (
        <MaterialIcon
          color={colors.error.default}
          size={36}
          name="alert-circle-outline"
          style={styles.checkIcon}
        />
      );
    case 'import_success':
      return (
        <IonicIcon
          color={colors.icon.default}
          size={36}
          name="checkmark"
          style={styles.checkIcon}
        />
      );
    case 'simple_notification_rejected':
      return (
        <AntIcon
          color={colors.error.default}
          size={36}
          name="closecircleo"
          style={styles.checkIcon}
        />
      );
    case 'simple_notification':
      return (
        <AntIcon
          color={colors.success.default}
          size={36}
          name="checkcircleo"
          style={styles.checkIcon}
        />
      );
    default:
      return null;
  }
};

const getTitle = (
  status: BaseNotificationStatus | undefined,
  { nonce, amount, assetType }: BaseNotificationData,
): string | undefined => {
  switch (status) {
    case 'pending':
      return strings('notifications.pending_title');
    case 'pending_deposit':
      return strings('notifications.pending_deposit_title');
    case 'pending_withdrawal':
      return strings('notifications.pending_withdrawal_title');
    case 'success': {
      const parsed = nonce != null ? parseInt(String(nonce)) : NaN;
      if (!Number.isNaN(parsed)) {
        return strings('notifications.success_title', { nonce: parsed });
      }
      return strings('notifications.success_title', { nonce: '' })
        .replace(' # ', ' ')
        .trim();
    }
    case 'success_deposit':
      return strings('notifications.success_deposit_title');
    case 'success_withdrawal':
      return strings('notifications.success_withdrawal_title');
    case 'received':
      return strings('notifications.received_title', { amount, assetType });
    case 'speedup': {
      const parsed = nonce != null ? parseInt(String(nonce)) : NaN;
      if (!Number.isNaN(parsed)) {
        return strings('notifications.speedup_title', { nonce: parsed });
      }
      return strings('notifications.speedup_title', { nonce: '' })
        .replace(' #', '')
        .trim();
    }
    case 'received_payment':
      return strings('notifications.received_payment_title');
    case 'cancelled':
      return strings('notifications.cancelled_title');
    case 'error':
      return strings('notifications.error_title');
    default:
      return undefined;
  }
};

export const getDescription = (
  status: BaseNotificationStatus | undefined,
  { amount = null, type = null }: BaseNotificationData,
): string => {
  if (amount && typeof amount !== 'object' && type) {
    return strings(`notifications.${type}_${status}_message`, { amount });
  }
  return strings(`notifications.${status}_message`);
};

const BaseNotification: React.FC<BaseNotificationProps> = ({
  status,
  data,
  onPress,
  onHide,
  autoDismiss = false,
}) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const { colors } = theme;
  const safeData: BaseNotificationData = data ?? {};
  const { description = null, title = null } = safeData;

  return (
    <View style={baseStyles.flexGrow}>
      <View style={styles.floatingBackground}>
        <TouchableOpacity
          style={styles.defaultFlashFloating}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <View style={styles.flashIcon}>
            {getIcon(status, colors, styles)}
          </View>
          <View style={styles.flashLabel}>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              color={TextColor.TextDefault}
              style={styles.flashTitle}
              testID={ToastSelectorsIDs.NOTIFICATION_TITLE}
            >
              {!title ? getTitle(status, safeData) : title}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextDefault}
              style={styles.flashText}
            >
              {!description ? getDescription(status, safeData) : description}
            </Text>
          </View>
          <View>
            {autoDismiss && (
              <TouchableOpacity style={styles.closeTouchable} onPress={onHide}>
                <IonicIcon name="close" size={36} style={styles.closeIcon} />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default BaseNotification;
