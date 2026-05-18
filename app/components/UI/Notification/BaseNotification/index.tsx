import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import {
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  IconAlert,
  IconAlertSeverity,
} from '@metamask/design-system-react-native';

import { baseStyles } from '../../../../styles/common';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import { ToastSelectorsIDs } from '../../../../component-library/components/Toast/ToastModal.testIds';

import AnimatedSpinner from '../../AnimatedSpinner';
import styleSheet from './BaseNotification.styles';
import {
  BaseNotificationData,
  BaseNotificationProps,
  BaseNotificationStatus,
} from './BaseNotification.types';

export const getIcon = (status: BaseNotificationStatus | undefined) => {
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
    case 'import_success':
    case 'simple_notification':
      return (
        <IconAlert severity={IconAlertSeverity.Success} size={IconSize.Lg} />
      );
    case 'cancelled':
    case 'error':
    case 'simple_notification_rejected':
      return (
        <IconAlert severity={IconAlertSeverity.Error} size={IconSize.Lg} />
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
  const { styles } = useStyles(styleSheet, {});
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
          <View style={styles.flashIcon}>{getIcon(status)}</View>
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
                <Icon
                  name={IconName.Close}
                  size={IconSize.Lg}
                  style={styles.closeIcon}
                />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default BaseNotification;
