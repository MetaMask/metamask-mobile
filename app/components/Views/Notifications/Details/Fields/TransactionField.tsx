import React from 'react';
import { Pressable, View } from 'react-native';
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

type TransactionFieldProps = ModalFieldTransaction;

function TransactionField(props: TransactionFieldProps) {
  const { txHash } = props;
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
          onPress={() =>
            copyToClipboard(txHash, CopyClipboardAlertMessage.transaction())
          }
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
