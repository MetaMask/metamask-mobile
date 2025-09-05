import React from 'react';
import { Pressable, View, ViewStyle } from 'react-native';
import { useSelector } from 'react-redux';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { ModalFieldAddress } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import EthereumAddress from '../../../../UI/EthereumAddress';
import useCopyClipboard, {
  CopyClipboardAlertMessage,
} from '../hooks/useCopyClipboard';
import useStyles from '../useStyles';
import { selectAvatarAccountType } from '../../../../../selectors/settings';

type AddressFieldProps = ModalFieldAddress;

function AddressField(props: AddressFieldProps) {
  const { label, address } = props;
  const { styles } = useStyles();
  const copyToClipboard = useCopyClipboard();

  const accountAvatarType = useSelector(selectAvatarAccountType);

  return (
    <View style={styles.row}>
      <Avatar
        variant={AvatarVariant.Account}
        type={accountAvatarType}
        accountAddress={address}
        size={AvatarSize.Md}
        style={styles.badgeWrapper}
      />
      <View style={styles.boxLeft}>
        <Text variant={TextVariant.BodyLGMedium}>{label}</Text>
        <Pressable
          onPress={() =>
            copyToClipboard(address, CopyClipboardAlertMessage.address())
          }
          hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}
          style={styles.copyContainer}
        >
          <EthereumAddress
            style={styles.addressLinkLabel}
            address={address}
            type={'short'}
          />
          <Icon
            style={styles.copyIconDefault as ViewStyle}
            name={IconName.Copy}
            size={IconSize.Md}
          />
        </Pressable>
      </View>
    </View>
  );
}

export default AddressField;
