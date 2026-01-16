import React from 'react';
import { View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import { strings } from '../../../../../../locales/i18n';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { ModalFieldTransaction } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import useCopyClipboard, {
  CopyClipboardAlertMessage,
} from '../hooks/useCopyClipboard';
import useStyles from '../useStyles';
import { useMetrics } from '../../../../../components/hooks/useMetrics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import type { INotification } from '../../../../../util/notifications/types';
import onChainAnalyticProperties from '../../../../../util/notifications/methods/notification-analytics';

type TransactionFieldProps = ModalFieldTransaction & {
  notification: INotification;
};

function TransactionField(props: TransactionFieldProps) {
  const { trackEvent, createEventBuilder } = useMetrics();
  const { txHash, notification } = props;
  const { styles, theme } = useStyles();
  const copyToClipboard = useCopyClipboard();

  return (
    <View style={styles.row}>
      <Avatar
        variant={AvatarVariant.Icon}
        size={AvatarSize.Md}
        style={styles.badgeWrapper}
        name={IconName.Check}
        backgroundColor={theme.colors.success.muted}
        iconColor={IconColor.Success}
      />
      <View style={styles.boxLeft}>
        <Text variant={TextVariant.BodyLGMedium}>
          {strings('transactions.status')}
        </Text>

        <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
          {strings(`transaction.confirmed`)}
        </Text>
      </View>
      <View style={styles.rightSection}>
        <Pressable
          onPress={() => {
            trackEvent(
              createEventBuilder(MetaMetricsEvents.NOTIFICATION_DETAIL_CLICKED)
                .addProperties({
                  notification_id: notification.id,
                  notification_type: notification.type,
                  ...onChainAnalyticProperties(notification),
                  clicked_item: 'tx_id',
                })
                .build(),
            );
            copyToClipboard(txHash, CopyClipboardAlertMessage.transaction());
          }}
          hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}
          style={styles.copyContainer}
        >
          <Text variant={TextVariant.BodyMD} style={styles.copyTextBtn}>
            {strings('transaction.transaction_id')}
          </Text>
          <Icon
            color={IconColor.Primary}
            name={IconName.Copy}
            size={IconSize.Md}
          />
        </Pressable>
      </View>
    </View>
  );
}

export default TransactionField;
